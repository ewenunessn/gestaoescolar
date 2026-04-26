const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    // Verificar se tabela cardapio_modalidades existe
    const tabela = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'cardapio_modalidades'
      ) as existe
    `);
    console.log('cardapio_modalidades existe:', tabela.rows[0].existe);

    if (tabela.rows[0].existe) {
      const dados = await client.query('SELECT * FROM cardapio_modalidades LIMIT 20');
      console.log('\n=== DADOS cardapio_modalidades ===');
      console.table(dados.rows);
    }

    // Ver o cardápio id=5 (Ens. Integral) e suas modalidades
    const cardapio5 = await client.query(`
      SELECT cm.id, cm.modalidade_id, cm.nome, m.nome as mod_nome
      FROM cardapios_modalidade cm
      LEFT JOIN modalidades m ON m.id = cm.modalidade_id
      WHERE cm.id = 5
    `);
    console.log('\n=== CARDÁPIO ID=5 ===');
    console.table(cardapio5.rows);

  } finally {
    client.release();
    await pool.end();
  }
}
run().catch(console.error);
