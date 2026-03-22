const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function aplicar() {
  const client = await pool.connect();
  try {
    console.log('🔄 Criando tabela cardapio_modalidades no Neon...\n');

    await client.query(`
      CREATE TABLE IF NOT EXISTS cardapio_modalidades (
        id SERIAL PRIMARY KEY,
        cardapio_id INTEGER NOT NULL REFERENCES cardapios_modalidade(id) ON DELETE CASCADE,
        modalidade_id INTEGER NOT NULL REFERENCES modalidades(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(cardapio_id, modalidade_id)
      );

      CREATE INDEX IF NOT EXISTS idx_cardapio_modalidades_cardapio ON cardapio_modalidades(cardapio_id);
      CREATE INDEX IF NOT EXISTS idx_cardapio_modalidades_modalidade ON cardapio_modalidades(modalidade_id);

      -- Migrar dados existentes
      INSERT INTO cardapio_modalidades (cardapio_id, modalidade_id, created_at)
      SELECT id, modalidade_id, created_at
      FROM cardapios_modalidade
      WHERE modalidade_id IS NOT NULL
      ON CONFLICT (cardapio_id, modalidade_id) DO NOTHING;
    `);

    const count = await client.query('SELECT COUNT(*) FROM cardapio_modalidades');
    console.log(`✅ Tabela criada! Registros migrados: ${count.rows[0].count}`);
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

aplicar();
