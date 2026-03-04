#!/usr/bin/env node

/**
 * Script para aplicar migration de faturamentos em ambos os bancos (LOCAL e NEON)
 * 
 * Uso: node backend/scripts/apply-faturamentos-both-dbs.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Configurações dos bancos
const LOCAL_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'alimentacao_escolar',
  user: 'postgres',
  password: 'admin123'
};

const NEON_CONFIG = {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
};

// Ler migration
const migrationPath = path.join(__dirname, '../src/migrations/20260304_create_faturamentos_modalidades.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

async function aplicarMigration(config, nome) {
  const pool = new Pool(config);
  
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 Aplicando migration em ${nome}...`);
    console.log(`${'='.repeat(60)}\n`);

    await pool.query(migrationSQL);
    
    console.log(`✅ Migration aplicada com sucesso em ${nome}!`);
    
    // Verificar tabelas criadas
    const tabelas = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('faturamentos_pedidos', 'faturamentos_itens')
      ORDER BY table_name
    `);
    
    console.log(`\n📋 Tabelas criadas em ${nome}:`);
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
    
    console.log(`\n👁️  Views criadas em ${nome}:`);
    views.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    
  } catch (error) {
    console.error(`\n❌ Erro ao aplicar migration em ${nome}:`, error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log('\n🚀 Iniciando aplicação de migration de faturamentos...\n');
  
  try {
    // Aplicar em LOCAL
    await aplicarMigration(LOCAL_CONFIG, 'LOCAL');
    
    // Aplicar em NEON
    if (process.env.DATABASE_URL) {
      await aplicarMigration(NEON_CONFIG, 'NEON');
    } else {
      console.log('\n⚠️  DATABASE_URL não configurada, pulando NEON');
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ Migration aplicada com sucesso em todos os bancos!');
    console.log(`${'='.repeat(60)}\n`);
    
  } catch (error) {
    console.error('\n❌ Erro durante a aplicação:', error);
    process.exit(1);
  }
}

main();
