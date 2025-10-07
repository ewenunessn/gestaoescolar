require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function executarMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔗 Conectando ao banco de dados...');
    const client = await pool.connect();
    console.log('✅ Conectado!');

    const sqlPath = path.join(__dirname, 'src', 'migrations', 'create_saldo_contratos_modalidades.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('\n📝 Executando migration create_saldo_contratos_modalidades.sql...');
    await client.query(sql);
    console.log('✅ Migration executada com sucesso!');

    client.release();
  } catch (error) {
    console.error('❌ Erro ao executar migration:', error.message);
    console.error(error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

executarMigration();
