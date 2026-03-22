/**
 * Remove a coluna modalidade_id de cardapios_modalidade
 * O sistema passa a usar exclusivamente a tabela cardapio_modalidades (N:N)
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Garantir que todos os cardápios existentes têm entrada na tabela de junção
    console.log('Migrando dados existentes para cardapio_modalidades...');
    const migrado = await client.query(`
      INSERT INTO cardapio_modalidades (cardapio_id, modalidade_id)
      SELECT cm.id, cm.modalidade_id
      FROM cardapios_modalidade cm
      WHERE cm.modalidade_id IS NOT NULL
      ON CONFLICT (cardapio_id, modalidade_id) DO NOTHING
      RETURNING cardapio_id, modalidade_id
    `);
    console.log(`Migrados ${migrado.rows.length} registros para cardapio_modalidades`);

    // 2. Verificar se algum cardápio ficaria sem modalidade
    const semModalidade = await client.query(`
      SELECT cm.id, cm.nome
      FROM cardapios_modalidade cm
      WHERE NOT EXISTS (
        SELECT 1 FROM cardapio_modalidades cjm WHERE cjm.cardapio_id = cm.id
      )
    `);
    if (semModalidade.rows.length > 0) {
      console.warn('⚠️  Cardápios sem modalidade na tabela de junção:', semModalidade.rows);
    } else {
      console.log('✅ Todos os cardápios têm modalidade na tabela de junção');
    }

    // 3. Remover FK constraint se existir
    const fkResult = await client.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'cardapios_modalidade'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%modalidade%'
    `);
    for (const row of fkResult.rows) {
      console.log(`Removendo FK: ${row.constraint_name}`);
      await client.query(`ALTER TABLE cardapios_modalidade DROP CONSTRAINT IF EXISTS "${row.constraint_name}"`);
    }

    // 4. Remover a coluna modalidade_id
    await client.query(`ALTER TABLE cardapios_modalidade DROP COLUMN IF EXISTS modalidade_id`);
    console.log('✅ Coluna modalidade_id removida de cardapios_modalidade');

    await client.query('COMMIT');
    console.log('\n✅ Migration concluída com sucesso!');

    // Verificar resultado
    const cols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'cardapios_modalidade'
      ORDER BY ordinal_position
    `);
    console.log('\nColunas restantes em cardapios_modalidade:');
    console.table(cols.rows);

    const juncao = await client.query('SELECT * FROM cardapio_modalidades');
    console.log('\nDados em cardapio_modalidades:');
    console.table(juncao.rows);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
