const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('✅ Conectado ao Neon\n');

  try {
    // Listar contratos atuais
    console.log('📋 Contratos antes da atualização:\n');
    const antes = await client.query(`
      SELECT c.id, c.numero, f.nome as fornecedor, c.data_inicio, c.data_fim
      FROM contratos c
      JOIN fornecedores f ON c.fornecedor_id = f.id
      ORDER BY c.numero
    `);

    antes.rows.forEach(c => {
      console.log(`  Contrato ${c.numero} - ${c.fornecedor}`);
      console.log(`    Vigência: ${c.data_inicio.toISOString().split('T')[0]} até ${c.data_fim.toISOString().split('T')[0]}`);
    });

    // Atualizar todos os contratos para vencer em 30/06/2026
    console.log('\n📝 Atualizando vencimento para 30/06/2026...\n');
    
    const result = await client.query(`
      UPDATE contratos 
      SET data_fim = '2026-06-30'
      WHERE data_fim < '2026-06-30' OR data_fim > '2026-06-30'
      RETURNING id, numero
    `);

    console.log(`✅ ${result.rowCount} contrato(s) atualizado(s)\n`);

    // Listar contratos após atualização
    console.log('📋 Contratos após a atualização:\n');
    const depois = await client.query(`
      SELECT c.id, c.numero, f.nome as fornecedor, c.data_inicio, c.data_fim
      FROM contratos c
      JOIN fornecedores f ON c.fornecedor_id = f.id
      ORDER BY c.numero
    `);

    depois.rows.forEach(c => {
      console.log(`  Contrato ${c.numero} - ${c.fornecedor}`);
      console.log(`    Vigência: ${c.data_inicio.toISOString().split('T')[0]} até ${c.data_fim.toISOString().split('T')[0]}`);
    });

    console.log('\n✅ Todos os contratos agora vencem em 30/06/2026!');

  } catch (error) {
    console.error('\n❌ ERRO:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Conexão fechada');
  }
}

run().catch(console.error);
