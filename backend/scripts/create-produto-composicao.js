require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Defina POSTGRES_URL ou DATABASE_URL no ambiente.');
  process.exit(1);
}

const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

const sql = `
CREATE TABLE IF NOT EXISTS produto_composicao_nutricional (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  energia_kcal DECIMAL(8,2),
  proteina_g DECIMAL(8,2),
  carboidratos_g DECIMAL(8,2),
  lipideos_g DECIMAL(8,2),
  fibra_alimentar_g DECIMAL(8,2),
  sodio_mg DECIMAL(8,2),
  acucares_g DECIMAL(8,2),
  gorduras_saturadas_g DECIMAL(8,2),
  gorduras_trans_g DECIMAL(8,2),
  colesterol_mg DECIMAL(8,2),
  calcio_mg DECIMAL(8,2),
  ferro_mg DECIMAL(8,2),
  vitamina_e_mg DECIMAL(8,2),
  vitamina_b1_mg DECIMAL(8,2),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(produto_id)
);

CREATE INDEX IF NOT EXISTS idx_produto_composicao_produto_id
ON produto_composicao_nutricional(produto_id);
`;

async function run() {
  try {
    const duplicates = await pool.query(`
      SELECT id, COUNT(*) as total
      FROM produtos
      GROUP BY id
      HAVING COUNT(*) > 1
      LIMIT 1
    `);
    if (duplicates.rows.length > 0) {
      throw new Error(`IDs duplicados em produtos: ${duplicates.rows[0].id}`);
    }

    const uniqueCheck = await pool.query(`
      SELECT 1
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      WHERE c.conrelid = 'produtos'::regclass
        AND c.contype IN ('p','u')
        AND a.attname = 'id'
      LIMIT 1
    `);
    if (uniqueCheck.rows.length === 0) {
      await pool.query('ALTER TABLE produtos ADD CONSTRAINT produtos_id_unique UNIQUE (id)');
    }

    await pool.query(sql);
    console.log('Tabela produto_composicao_nutricional criada/confirmada.');
  } catch (error) {
    console.error('Erro ao criar tabela:', error.message || error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
