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

async function updateTable() {
  try {
    console.log('🔄 Atualizando tabela demandas para remover obrigatoriedade de autenticação...');
    
    // Alterar a coluna para permitir NULL e ter valor padrão
    await pool.query(`
      ALTER TABLE demandas 
      ALTER COLUMN usuario_criacao_id DROP NOT NULL,
      ALTER COLUMN usuario_criacao_id SET DEFAULT 1;
    `);
    
    console.log('✅ Tabela atualizada com sucesso!');
    console.log('📋 Campo usuario_criacao_id agora é opcional (padrão: 1)');
    console.log('\n🎉 Módulo de Demandas agora funciona sem autenticação!');
    
  } catch (error) {
    console.error('❌ Erro ao atualizar tabela:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updateTable();
