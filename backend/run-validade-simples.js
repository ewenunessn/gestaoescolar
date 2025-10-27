const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente
require('dotenv').config();

// Configuração do banco
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alimentacao_escolar',
  password: process.env.DB_PASSWORD || 'admin123',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Iniciando migration de validade simples...');
    
    // Ler o arquivo SQL
    const migrationPath = path.join(__dirname, 'migrations', 'add-validade-simples.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Executar a migration
    await client.query(migrationSQL);
    
    console.log('✅ Migration de validade simples executada com sucesso!');
    
    // Verificar se as tabelas foram criadas
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('estoque_escolas', 'historico_estoque')
    `);
    
    console.log('📋 Tabelas encontradas:', result.rows.map(r => r.table_name));
    
    // Verificar colunas da tabela estoque_escolas
    const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'estoque_escolas'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Colunas da tabela estoque_escolas:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Erro na migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('🎉 Migration concluída!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Falha na migration:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };