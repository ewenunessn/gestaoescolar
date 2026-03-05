require('dotenv').config();
const { Pool } = require('pg');

const neonDb = new Pool({
  connectionString: process.env.NEON_DATABASE_URL
});

async function verificarEstoqueBanana() {
  try {
    console.log('🔍 Verificando estoque de banana...\n');

    // Buscar ID da escola "EMEF Prof. Didi"
    const escolaResult = await neonDb.query(`
      SELECT id, nome FROM escolas 
      WHERE nome ILIKE '%didi%'
      LIMIT 5
    `);
    
    console.log('📚 Escolas encontradas:');
    escolaResult.rows.forEach(e => {
      console.log(`  - ID: ${e.id}, Nome: ${e.nome}`);
    });
    
    if (escolaResult.rows.length === 0) {
      console.log('\n❌ Nenhuma escola encontrada com "didi" no nome');
      return;
    }

    const escolaId = escolaResult.rows[0].id;
    console.log(`\n✅ Usando escola ID: ${escolaId} - ${escolaResult.rows[0].nome}\n`);

    // Buscar ID do produto banana
    const produtoResult = await neonDb.query(`
      SELECT id, nome, unidade FROM produtos 
      WHERE nome ILIKE '%banana%'
      LIMIT 5
    `);
    
    console.log('🍌 Produtos encontrados:');
    produtoResult.rows.forEach(p => {
      console.log(`  - ID: ${p.id}, Nome: ${p.nome}, Unidade: ${p.unidade}`);
    });

    if (produtoResult.rows.length === 0) {
      console.log('\n❌ Nenhum produto encontrado com "banana" no nome');
      return;
    }

    const produtoId = produtoResult.rows[0].id;
    console.log(`\n✅ Usando produto ID: ${produtoId} - ${produtoResult.rows[0].nome}\n`);

    // Verificar estoque
    const estoqueResult = await neonDb.query(`
      SELECT * FROM estoque_escolas 
      WHERE escola_id = $1 AND produto_id = $2
    `, [escolaId, produtoId]);

    console.log('📦 Registro de estoque:');
    if (estoqueResult.rows.length === 0) {
      console.log('  ❌ NENHUM REGISTRO ENCONTRADO na tabela estoque_escolas');
      console.log('  Isso explica por que mostra 0 UN no frontend!\n');
    } else {
      console.log('  ✅ Registro encontrado:');
      console.log(JSON.stringify(estoqueResult.rows[0], null, 2));
    }

    // Testar a query do controller
    console.log('\n🔍 Testando query do controller:');
    const controllerResult = await neonDb.query(`
      SELECT 
        p.id as produto_id,
        p.nome as produto_nome,
        p.categoria,
        COALESCE(ee.quantidade_atual, 0) as quantidade_atual,
        COALESCE(ee.quantidade_minima, 0) as quantidade_minima,
        COALESCE(ee.quantidade_maxima, 0) as quantidade_maxima,
        ee.data_ultima_atualizacao,
        ee.observacoes,
        COALESCE(p.unidade, 'UN') as unidade
      FROM produtos p
      LEFT JOIN estoque_escolas ee 
        ON ee.produto_id = p.id AND ee.escola_id = $1
      WHERE p.id = $2 AND p.ativo = true
    `, [escolaId, produtoId]);

    console.log('Resultado da query do controller:');
    console.log(JSON.stringify(controllerResult.rows[0], null, 2));

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await neonDb.end();
    process.exit(0);
  }
}

verificarEstoqueBanana();
