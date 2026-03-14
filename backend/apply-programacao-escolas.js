// Aplica a migration de programação de entrega por escola
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const sslConfig = process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('sslmode=require')
  ? { rejectUnauthorized: false }
  : false;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: sslConfig });

async function run() {
  const sql = fs.readFileSync(
    path.join(__dirname, 'migrations/20260314_add_pedido_programacao_escolas.sql'),
    'utf8'
  );
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('✅ Migration aplicada com sucesso');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
