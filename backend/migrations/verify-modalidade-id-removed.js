const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    // Colunas atuais de cardapios_modalidade
    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'cardapios_modalidade'
      ORDER BY ordinal_position
    `);
    console.log('\n=== COLUNAS DE cardapios_modalidade ===');
    console.table(cols.rows);

    const temColuna = cols.rows.some(r => r.column_name === 'modalidade_id');
    console.log('\nmodalidade_id ainda existe?', temColuna ? '❌ SIM — não foi removida' : '✅ NÃO — removida com sucesso');

    // FKs existentes
    const fks = await client.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'cardapios_modalidade'
      ORDER BY constraint_type
    `);
    console.log('\n=== CONSTRAINTS DE cardapios_modalidade ===');
    console.table(fks.rows);

    // Dados em cardapio_modalidades (junção)
    const juncao = await client.query(`
      SELECT cjm.*, m.nome as modalidade_nome, cm.nome as cardapio_nome
      FROM cardapio_modalidades cjm
      JOIN modalidades m ON m.id = cjm.modalidade_id
      JOIN cardapios_modalidade cm ON cm.id = cjm.cardapio_id
    `);
    console.log('\n=== DADOS EM cardapio_modalidades (junção) ===');
    console.table(juncao.rows);

  } finally {
    client.release();
    await pool.end();
  }
}
run().catch(console.error);
