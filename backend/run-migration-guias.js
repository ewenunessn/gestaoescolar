#!/usr/bin/env node

/**
 * Script para executar migração das tabelas de guias
 * Executar: node run-migration-guias.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente
require('dotenv').config();

// Configuração de conexão usando as variáveis de ambiente do arquivo .env
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  // Carregar variáveis de ambiente no início da função
  require('dotenv').config();
  
  const client = await pool.connect();
  
  try {
    console.log('🔄 Conectando ao banco de dados...');
    console.log('📍 URL do banco:', process.env.POSTGRES_URL ? 'POSTGRES_URL definida' : 'POSTGRES_URL não definida');
    
    // Ler o arquivo de migração das guias
    const migrationPath = path.join(__dirname, 'src', 'migrations', '20241215_create_guias_tables.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📋 Executando migração das tabelas de guias...');
    
    // Executar o SQL
    await client.query(sql);
    
    console.log('✅ Tabelas de guias criadas com sucesso!');
    
    // Verificar se as tabelas foram criadas
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('guias', 'guia_produto_escola')
    `);
    
    console.log(`📊 Tabelas criadas: ${result.rows.map(r => r.table_name).join(', ')}`);
    
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