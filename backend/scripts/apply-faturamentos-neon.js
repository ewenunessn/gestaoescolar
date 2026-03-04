#!/usr/bin/env node

/**
 * Script para aplicar migration de faturamentos no NEON
 * 
 * Uso: node backend/scripts/apply-faturamentos-neon.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Configuração NEON
const NEON_CONFIG = {
  connectionString: process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
};

// Ler migration
const migrationPath = path.join(__dirname, '../src/migrations/20260304_create_faturamentos_modalidades.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

async function aplicarMigration() {
  const pool = new Pool(NEON_CONFIG);
  
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 Aplicando migration em NEON...`);
    console.log(`${'='.repeat(60)}\n`);

    await pool.query(migrationSQL);
    
    console.log(`✅ Migration aplicada com sucesso em NEON!`);
    
    // Verificar tabelas criadas
    const tabelas = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('faturamentos_pedidos', 'faturamentos_itens')
      ORDER BY table_name
    `);
    
    console.log(`\n📋 Tabelas criadas em NEON:`);
    tabelas.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    
    // Verificar views criadas
    const views = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'vw_faturamentos%'
      ORDER BY table_name
    `);
    
    console.log(`\n👁️  Views criadas em NEON:`);
    views.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ Migration aplicada com sucesso no NEON!');
    console.log(`${'='.repeat(60)}\n`);
    
  } catch (error) {
    console.error(`\n❌ Erro ao aplicar migration em NEON:`, error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

aplicarMigration().catch(error => {
  console.error('\n❌ Erro durante a aplicação:', error);
  process.exit(1);
});
