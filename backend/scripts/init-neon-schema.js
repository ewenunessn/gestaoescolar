/* Simple Neon schema initializer
 * Uses POSTGRES_URL or DATABASE_URL from env
 * Executes scripts/init-neon-schema.sql
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ Defina POSTGRES_URL ou DATABASE_URL no ambiente.');
    process.exit(1);
  }

  const sqlPath = path.join(__dirname, 'init-neon-schema.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('❌ Arquivo SQL não encontrado:', sqlPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  console.log('🔌 Conectando ao PostgreSQL (Neon)...');
  await client.connect();
  try {
    console.log('▶️ Executando script de inicialização...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Schema essencial aplicado com sucesso.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Falha ao aplicar schema:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('❌ Erro inesperado:', err);
  process.exit(1);
});

