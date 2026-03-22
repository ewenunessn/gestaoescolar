/**
 * Cria tabelas solicitacoes + solicitacoes_itens (com status por item)
 * Execute: node backend/migrations/migrar-solicitacoes-itens.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  // Cabeçalho da solicitação
  await pool.query(`
    CREATE TABLE IF NOT EXISTS solicitacoes (
      id SERIAL PRIMARY KEY,
      escola_id INTEGER NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
      observacao TEXT,
      status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','parcial','concluida','cancelada')),
      respondido_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      respondido_em TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Itens com status individual
  await pool.query(`
    CREATE TABLE IF NOT EXISTS solicitacoes_itens (
      id SERIAL PRIMARY KEY,
      solicitacao_id INTEGER NOT NULL REFERENCES solicitacoes(id) ON DELETE CASCADE,
      produto_id INTEGER REFERENCES produtos(id) ON DELETE SET NULL,
      nome_produto TEXT NOT NULL,
      quantidade NUMERIC(10,3) NOT NULL,
      unidade TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aceito','recusado')),
      justificativa_recusa TEXT,
      respondido_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      respondido_em TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Migrar dados da tabela antiga se existir
  const existe = await pool.query(`
    SELECT 1 FROM information_schema.tables WHERE table_name = 'solicitacoes_alimentos'
  `);
  if (existe.rows.length > 0) {
    const antigas = await pool.query('SELECT * FROM solicitacoes_alimentos');
    for (const row of antigas.rows) {
      const sol = await pool.query(
        `INSERT INTO solicitacoes (escola_id, observacao, status, respondido_por, respondido_em, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [row.escola_id, row.observacao,
         row.status === 'aceita' ? 'concluida' : row.status === 'recusada' ? 'cancelada' : 'pendente',
         row.respondido_por, row.respondido_em, row.created_at, row.updated_at]
      );
      await pool.query(
        `INSERT INTO solicitacoes_itens (solicitacao_id, produto_id, nome_produto, quantidade, unidade, status, justificativa_recusa, respondido_por, respondido_em)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [sol.rows[0].id, row.produto_id, row.nome_produto, row.quantidade, row.unidade,
         row.status === 'aceita' ? 'aceito' : row.status === 'recusada' ? 'recusado' : 'pendente',
         row.justificativa_recusa, row.respondido_por, row.respondido_em]
      );
    }
    console.log(`Migradas ${antigas.rows.length} solicitações antigas.`);
  }

  console.log('✅ Tabelas solicitacoes e solicitacoes_itens criadas/verificadas.');
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
