const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function normalizeConnectionStringSsl(value) {
  const isLocal = value.includes('localhost') || value.includes('127.0.0.1');
  if (isLocal) return value;

  const url = new URL(value);
  const sslmode = url.searchParams.get('sslmode');
  if (!sslmode || ['prefer', 'require', 'verify-ca'].includes(sslmode)) {
    url.searchParams.set('sslmode', 'verify-full');
  }
  return url.toString();
}

async function main() {
  const migrationArg = process.argv[2];
  if (!migrationArg) {
    throw new Error('Informe o caminho do arquivo de migracao.');
  }

  const migrationPath = path.resolve(process.cwd(), migrationArg);
  if (!migrationPath.startsWith(path.resolve(__dirname, '..'))) {
    throw new Error('A migracao deve estar dentro da pasta backend.');
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  const connectionString = process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('NEON_DATABASE_URL, POSTGRES_URL ou DATABASE_URL nao configurada no backend/.env.');
  }

  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const pool = new Pool({
    connectionString: normalizeConnectionStringSsl(connectionString),
    ssl: isLocal ? false : { rejectUnauthorized: true },
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    const table = await client.query('SELECT to_regclass($1) AS table_name', ['public.escola_modalidades_historico']);
    const count = await client.query('SELECT COUNT(*)::int AS total FROM escola_modalidades_historico');
    const indexes = await client.query(
      `SELECT indexname
       FROM pg_indexes
       WHERE schemaname = $1 AND tablename = $2
       ORDER BY indexname`,
      ['public', 'escola_modalidades_historico']
    );

    console.log(JSON.stringify({
      ok: true,
      migration: path.basename(migrationPath),
      table: table.rows[0].table_name,
      total_rows: count.rows[0].total,
      indexes: indexes.rows.map((row) => row.indexname),
    }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(JSON.stringify({
      ok: false,
      migration: path.basename(migrationPath),
      error: error.message,
    }, null, 2));
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error.message,
  }, null, 2));
  process.exit(1);
});
