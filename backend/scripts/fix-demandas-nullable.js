const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alimentacao_escolar',
  password: process.env.DB_PASSWORD || 'admin123',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function fixTable() {
  try {
    console.log('🔄 Corrigindo coluna data_semead para permitir NULL...');
    
    // Alterar a coluna para permitir NULL
    await pool.query(`
      ALTER TABLE demandas 
      ALTER COLUMN data_semead DROP NOT NULL;
    `);
    
    console.log('✅ Coluna data_semead agora permite NULL!');
    console.log('📋 Agora você pode criar demandas sem informar a data de envio à SEMEAD');
    console.log('\n🎉 Correção aplicada com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao corrigir tabela:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixTable();
