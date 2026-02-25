const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuração do banco de dados
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'alimentacao_escolar',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin123',
});

async function executeMigration() {
  try {
    console.log('🔄 Executando migração para composição nutricional...');
    
    // Ler o arquivo de migração
    const migrationPath = path.join(__dirname, 'src/migrations/create_produto_composicao_nutricional.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Executar a migração
    await pool.query(migrationSQL);
    
    console.log('✅ Migração executada com sucesso!');
    console.log('📊 Tabela produto_composicao_nutricional criada');
    
    // Verificar se a tabela foi criada
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'produto_composicao_nutricional'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Tabela confirmada no banco de dados');
    } else {
      console.log('❌ Erro: Tabela não foi criada');
    }
    
  } catch (error) {
    console.error('❌ Erro ao executar migração:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

executeMigration();