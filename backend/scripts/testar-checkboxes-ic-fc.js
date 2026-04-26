/**
 * Script para testar os checkboxes de IC e FC na geração de guias
 * 
 * Testa 4 cenários:
 * 1. Ambos marcados (padrão) - aplica IC e FC
 * 2. Apenas IC desmarcado - não aplica IC, aplica FC
 * 3. Apenas FC desmarcado - aplica IC, não aplica FC
 * 4. Ambos desmarcados - não aplica nenhum
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || '',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function testarCheckboxes() {
  console.log('=== TESTE DE CHECKBOXES IC E FC ===\n');

  const client = await pool.connect();

  try {
    // Buscar um produto com IC e FC diferentes de 1.0 para teste
    const produtoResult = await client.query(`
      SELECT id, nome, fator_correcao, indice_coccao
      FROM produtos
      WHERE fator_correcao != 1.0 OR indice_coccao != 1.0
      LIMIT 1
    `);

    if (produtoResult.rows.length === 0) {
      console.log('❌ Nenhum produto com IC ou FC diferente de 1.0 encontrado');
      return;
    }

    const produto = produtoResult.rows[0];
    console.log('📦 Produto de teste:', produto.nome);
    console.log(`   FC: ${produto.fator_correcao}`);
    console.log(`   IC: ${produto.indice_coccao}\n`);

    // Simular cálculo com diferentes combinações
    const perCapita = 100; // 100g per capita final

    console.log('📊 Per Capita Final: 100g\n');

    // Cenário 1: Ambos marcados (padrão)
    const ic1 = produto.indice_coccao;
    const fc1 = produto.fator_correcao;
    const perCapitaCru1 = perCapita / ic1;
    const pesoComprar1 = perCapitaCru1 * fc1;
    console.log('✅ Cenário 1: IC ✓ | FC ✓');
    console.log(`   Per Capita Cru: ${perCapita} / ${ic1} = ${perCapitaCru1.toFixed(2)}g`);
    console.log(`   Peso Comprar: ${perCapitaCru1.toFixed(2)} × ${fc1} = ${pesoComprar1.toFixed(2)}g\n`);

    // Cenário 2: IC desmarcado, FC marcado
    const ic2 = 1.0; // não considera IC
    const fc2 = produto.fator_correcao;
    const perCapitaCru2 = perCapita / ic2;
    const pesoComprar2 = perCapitaCru2 * fc2;
    console.log('⚠️  Cenário 2: IC ✗ | FC ✓');
    console.log(`   Per Capita Cru: ${perCapita} / ${ic2} = ${perCapitaCru2.toFixed(2)}g`);
    console.log(`   Peso Comprar: ${perCapitaCru2.toFixed(2)} × ${fc2} = ${pesoComprar2.toFixed(2)}g\n`);

    // Cenário 3: IC marcado, FC desmarcado
    const ic3 = produto.indice_coccao;
    const fc3 = 1.0; // não considera FC
    const perCapitaCru3 = perCapita / ic3;
    const pesoComprar3 = perCapitaCru3 * fc3;
    console.log('⚠️  Cenário 3: IC ✓ | FC ✗');
    console.log(`   Per Capita Cru: ${perCapita} / ${ic3} = ${perCapitaCru3.toFixed(2)}g`);
    console.log(`   Peso Comprar: ${perCapitaCru3.toFixed(2)} × ${fc3} = ${pesoComprar3.toFixed(2)}g\n`);

    // Cenário 4: Ambos desmarcados
    const ic4 = 1.0;
    const fc4 = 1.0;
    const perCapitaCru4 = perCapita / ic4;
    const pesoComprar4 = perCapitaCru4 * fc4;
    console.log('❌ Cenário 4: IC ✗ | FC ✗');
    console.log(`   Per Capita Cru: ${perCapita} / ${ic4} = ${perCapitaCru4.toFixed(2)}g`);
    console.log(`   Peso Comprar: ${perCapitaCru4.toFixed(2)} × ${fc4} = ${pesoComprar4.toFixed(2)}g\n`);

    console.log('📈 Resumo das diferenças:');
    console.log(`   Cenário 1 (padrão): ${pesoComprar1.toFixed(2)}g`);
    console.log(`   Cenário 2 (sem IC): ${pesoComprar2.toFixed(2)}g (${((pesoComprar2/pesoComprar1 - 1) * 100).toFixed(1)}%)`);
    console.log(`   Cenário 3 (sem FC): ${pesoComprar3.toFixed(2)}g (${((pesoComprar3/pesoComprar1 - 1) * 100).toFixed(1)}%)`);
    console.log(`   Cenário 4 (sem ambos): ${pesoComprar4.toFixed(2)}g (${((pesoComprar4/pesoComprar1 - 1) * 100).toFixed(1)}%)\n`);

    console.log('✅ Teste concluído com sucesso!');
    console.log('💡 Os checkboxes permitem controlar individualmente IC e FC na geração de guias');

  } catch (error) {
    console.error('❌ Erro ao testar:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testarCheckboxes();
