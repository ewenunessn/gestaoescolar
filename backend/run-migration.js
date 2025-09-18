#!/usr/bin/env node

/**
 * Script para executar migrações no banco de dados
 * Executar: node run-migration.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração de conexão - ajustar conforme necessário
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/gestaoescolar',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Conectando ao banco de dados...');
    
    // Ler o arquivo de migração
    const migrationPath = path.join(__dirname, 'src', 'migrations', 'create_produto_composicao_nutricional.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📋 Executando migração...');
    
    // Executar o SQL
    await client.query(sql);
    
    console.log('✅ Tabela produto_composicao_nutricional criada com sucesso!');
    
    // Verificar se a tabela foi criada
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'produto_composicao_nutricional'
    `);
    
    if (result.rows.length > 0) {
      console.log('📊 Tabela verificada com sucesso!');
    }
    
  } catch (error) {
    console.error('❌ Erro ao executar migração:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };