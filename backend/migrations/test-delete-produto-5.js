const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar'
});

async function testDelete() {
  await client.connect();
  console.log('=== Testando DELETE produto id=2 ===\n');

  try {
    // Verifica se existe
    const check = await client.query('SELECT id, nome FROM produtos WHERE id = 2');
    if (check.rows.length === 0) {
      console.log('❌ Produto 2 não existe');
      await client.end();
      return;
    }
    console.log(`✓ Produto encontrado: ${check.rows[0].nome}\n`);

    // Tenta deletar
    console.log('Tentando DELETE...');
    await client.query('DELETE FROM produtos WHERE id = 2');
    console.log('✓ DELETE bem-sucedido\n');
  } catch (err) {
    console.error('❌ Erro ao deletar:');
    console.error(`   Code: ${err.code}`);
    console.error(`   Message: ${err.message}`);
    console.error(`   Detail: ${err.detail || 'N/A'}`);
    console.error(`   Constraint: ${err.constraint || 'N/A'}`);
    console.error(`   Table: ${err.table || 'N/A'}`);
  }

  await client.end();
}

testDelete();
