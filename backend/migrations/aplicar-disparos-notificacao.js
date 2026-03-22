require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, '20260322_create_disparos_notificacao.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('✅ Tabela disparos_notificacao criada com sucesso');
  } catch (e) {
    console.error('❌ Erro:', e.message);
  } finally {
    await pool.end();
  }
}

run();
