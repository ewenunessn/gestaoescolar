const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Iniciando migração de tipos de refeição...\n');
    
    // Ler arquivo de migração
    const migrationPath = path.join(__dirname, '../migrations/0001_create_tipos_refeicao.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Executar migração
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('✅ Migração executada com sucesso!\n');
    
    // Verificar tipos criados
    const result = await client.query(`
      SELECT id, nome, chave, horario, ordem, ativo 
      FROM tipos_refeicao 
      ORDER BY ordem, horario
    `);
    
    console.log('📋 Tipos de refeição cadastrados:');
    console.log('─'.repeat(80));
    result.rows.forEach(tipo => {
      const status = tipo.ativo ? '✓' : '✗';
      console.log(`${status} [${tipo.ordem}] ${tipo.nome.padEnd(20)} | ${tipo.chave.padEnd(15)} | ${tipo.horario.substring(0, 5)}`);
    });
    console.log('─'.repeat(80));
    console.log(`\nTotal: ${result.rows.length} tipos de refeição\n`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao executar migração:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('✨ Processo concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Falha na migração:', error);
    process.exit(1);
  });
