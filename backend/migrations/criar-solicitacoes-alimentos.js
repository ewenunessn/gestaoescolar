/**
 * Cria tabela de solicitações de alimentos das escolas
 * Execute: node backend/migrations/criar-solicitacoes-alimentos.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS solicitacoes_alimentos (
      id SERIAL PRIMARY KEY,
      escola_id INTEGER NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
      produto_id INTEGER REFERENCES produtos(id) ON DELETE SET NULL,
      nome_produto TEXT NOT NULL,
      quantidade NUMERIC(10,3) NOT NULL,
      unidade TEXT NOT NULL,
      observacao TEXT,
      status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aceita','recusada')),
      justificativa_recusa TEXT,
      respondido_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      respondido_em TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Tabela solicitacoes_alimentos criada/verificada.');
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
