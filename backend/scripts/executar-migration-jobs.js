const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function executarMigration() {
  console.log('🚀 Executando migration de jobs...\n');

  const client = await pool.connect();

  try {
    const migrationPath = path.join(__dirname, '../migrations/20260324_criar_tabela_jobs.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    console.log('✅ Migration executada com sucesso!');
    console.log('📋 Tabela "jobs" criada');
    console.log('🔗 Campo "job_id" adicionado à tabela "guias"');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao executar migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

executarMigration();
