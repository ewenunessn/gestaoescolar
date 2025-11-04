const fs = require('fs');
const { exec } = require('child_process');

// Ler o arquivo SQL
const sqlContent = fs.readFileSync('./backend/complete-tenant-isolation-estoque.sql', 'utf8');

// Executar usando node-postgres
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alimentacao_escolar',
  password: process.env.DB_PASSWORD || 'admin123',
  port: process.env.DB_PORT || 5432,
  ssl: false
});

async function runIsolation() {
  try {
    console.log('🚀 Executando isolamento completo de tenant...');
    
    await pool.query(sqlContent);
    
    console.log('✅ Isolamento implementado com sucesso!');
    console.log('🎯 Agora cada tenant tem dados completamente isolados');
    console.log('📋 Tenants criados:');
    console.log('  - Rede Escolar Norte (cereais e grãos)');
    console.log('  - Rede Escolar Sul (carnes e laticínios)');
    console.log('  - Rede Escolar Centro (frutas e verduras)');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

runIsolation();