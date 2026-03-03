#!/usr/bin/env node
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('❌ Erro: DATABASE_URL ou POSTGRES_URL não configurado');
  console.log('💡 Configure a variável de ambiente ou edite o script para usar configuração local');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function aplicarMigration() {
  try {
    console.log('🚀 Aplicando migration do Estoque Central...\n');

    const migrationPath = path.join(__dirname, '../src/migrations/20260303_create_estoque_central.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(sql);

    console.log('✅ Migration aplicada com sucesso!\n');
    console.log('📦 Tabelas criadas:');
    console.log('  - estoque_central');
    console.log('  - estoque_central_lotes');
    console.log('  - estoque_central_movimentacoes');
    console.log('\n📊 Views criadas:');
    console.log('  - vw_estoque_central_completo');
    console.log('  - vw_lotes_proximos_vencimento');
    console.log('  - vw_estoque_baixo');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error);
    await pool.end();
    process.exit(1);
  }
}

aplicarMigration();
