require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'alimentacao_escolar',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin123',
});

async function checkTable() {
  try {
    console.log('🔍 Verificando estrutura da tabela produto_composicao_nutricional...');
    
    // Verificar se a tabela existe
    const tableExists = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'produto_composicao_nutricional'
    `);
    
    if (tableExists.rows.length === 0) {
      console.log('❌ Tabela produto_composicao_nutricional não existe');
      return;
    }
    
    console.log('✅ Tabela produto_composicao_nutricional existe');
    
    // Verificar colunas da tabela
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'produto_composicao_nutricional'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Colunas da tabela:');
    console.table(columns.rows);
    
  } catch (error) {
    console.error('❌ Erro ao verificar tabela:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkTable();