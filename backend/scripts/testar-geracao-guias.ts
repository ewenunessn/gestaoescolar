/**
 * Script de teste para geração de guias de demanda
 * Uso: npx ts-node scripts/testar-geracao-guias.ts
 */
import db from '../src/database';

async function testarGeracaoGuias() {
  console.log('='.repeat(80));
  console.log('🔍 TESTE DE GERAÇÃO DE GUIAS DE DEMANDA');
  console.log('='.repeat(80));

  try {
    // Teste 1: Verificar cardápios ativos
    console.log('\n📋 Teste 1: Verificando cardápios ativos no banco...');
    const cardapiosResult = await db.pool.query(`
      SELECT cm.id, cm.ano, cm.mes, cm.ativo, cm.nome
      FROM cardapios_modalidade cm
      WHERE cm.ativo = true
      ORDER BY cm.ano DESC, cm.mes DESC
      LIMIT 5
    `);
    console.log(`   Cardápios ativos encontrados: ${cardapiosResult.rows.length}`);
    cardapiosResult.rows.forEach(c => {
      console.log(`   - ID: ${c.id}, Nome: ${c.nome}, Ano: ${c.ano}, Mês: ${c.mes}`);
    });

    if (cardapiosResult.rows.length === 0) {
      console.log('\n⚠️  NENHUM CARDÁPIO ATIVO ENCONTRADO!');
      console.log('   Isso explica o erro "Nenhum produto calculado".');
      console.log('   Solução: Crie um cardápio ativo pelo sistema.');
      return;
    }

    // Usar o primeiro cardápio ativo para teste
    const cardapioTeste = cardapiosResult.rows[0];
    console.log(`\n   ✅ Usando cardápio de teste: ${cardapioTeste.nome} (${cardapioTeste.ano}-${cardapioTeste.mes})`);

    // Teste 2: Verificar refeições com produtos
    console.log('\n📋 Teste 2: Verificando refeições com produtos...');
    const refeicoesResult = await db.pool.query(`
      SELECT DISTINCT crd.dia, crd.cardapio_modalidade_id, r.nome as refeicao_nome,
             rp.produto_id, p.nome as produto_nome
      FROM cardapio_refeicoes_dia crd
      INNER JOIN cardapios_modalidade cm ON cm.id = crd.cardapio_modalidade_id
      INNER JOIN refeicoes r ON r.id = crd.refeicao_id
      INNER JOIN refeicao_produtos rp ON rp.refeicao_id = r.id
      INNER JOIN produtos p ON p.id = rp.produto_id
      WHERE cm.id = $1 AND crd.ativo = true
      LIMIT 5
    `, [cardapioTeste.id]);
    console.log(`   Refeições com produtos: ${refeicoesResult.rows.length}`);
    refeicoesResult.rows.forEach(r => {
      console.log(`   - Dia: ${r.dia}, Refeição: ${r.refeicao_nome}, Produto: ${r.produto_nome}`);
    });

    if (refeicoesResult.rows.length === 0) {
      console.log('\n⚠️  NENHUMA REFEIÇÃO COM PRODUTOS ENCONTRADA!');
      console.log('   Solução: Adicione produtos às refeições do cardápio.');
      return;
    }

    // Teste 3: Verificar escolas ativas
    console.log('\n📋 Teste 3: Verificando escolas ativas...');
    const escolasResult = await db.pool.query(`
      SELECT e.id, e.nome, em.modalidade_id, em.quantidade_alunos
      FROM escolas e
      INNER JOIN escola_modalidades em ON em.escola_id = e.id
      WHERE e.ativo = true
      LIMIT 5
    `);
    console.log(`   Escolas ativas encontradas: ${escolasResult.rows.length}`);
    escolasResult.rows.forEach(e => {
      console.log(`   - ID: ${e.id}, Nome: ${e.nome}, Alunos: ${e.quantidade_alunos}`);
    });

    if (escolasResult.rows.length === 0) {
      console.log('\n⚠️  NENHUMA ESCOLA ATIVA ENCONTRADA!');
      console.log('   Solução: Cadastre escolas e associe modalidades.');
      return;
    }

    // Teste 4: Executar a query completa de demanda
    console.log('\n📋 Teste 4: Simulando cálculo de demanda...');
    const diaInicio = refeicoesResult.rows[0].dia;
    const diaFim = refeicoesResult.rows[refeicoesResult.rows.length - 1].dia;

    const demandaResult = await db.pool.query(`
      SELECT
        crd.dia,
        cm2.modalidade_id,
        rp.produto_id,
        p.nome as produto_nome,
        COALESCE(um.codigo, 'UN') as unidade,
        p.peso as peso_embalagem,
        COALESCE(p.fator_correcao, 1.0) as fator_correcao,
        COALESCE(p.indice_coccao, 1.0) as indice_coccao,
        COALESCE(rpm.per_capita_ajustado, rp.per_capita) as per_capita,
        rp.tipo_medida
      FROM cardapio_refeicoes_dia crd
      INNER JOIN cardapios_modalidade cm ON cm.id = crd.cardapio_modalidade_id
      INNER JOIN cardapio_modalidades cm2 ON cm2.cardapio_id = cm.id
      INNER JOIN refeicoes r ON r.id = crd.refeicao_id
      INNER JOIN refeicao_produtos rp ON rp.refeicao_id = r.id
      INNER JOIN produtos p ON p.id = rp.produto_id
      LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
      LEFT JOIN refeicao_produto_modalidade rpm
        ON rpm.refeicao_produto_id = rp.id AND rpm.modalidade_id = cm2.modalidade_id
      WHERE crd.cardapio_modalidade_id = $1
        AND crd.ativo = true
        AND crd.dia BETWEEN $2 AND $3
    `, [cardapioTeste.id, diaInicio, diaFim]);

    console.log(`   Produtos encontrados na demanda: ${demandaResult.rows.length}`);
    demandaResult.rows.forEach(d => {
      console.log(`   - Dia: ${d.dia}, Produto: ${d.produto_nome}, Per capita: ${d.per_capita} ${d.unidade}`);
    });

    if (demandaResult.rows.length === 0) {
      console.log('\n⚠️  NENHUM PRODUTO ENCONTRADO NA DEMANDA!');
      console.log('   Verifique se os cardápios estão associados às modalidades.');
      return;
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ DIAGNÓSTICO COMPLETO!');
    console.log('='.repeat(80));
    console.log('\n📊 Resumo:');
    console.log(`   - Cardápios ativos: ${cardapiosResult.rows.length}`);
    console.log(`   - Refeições com produtos: ${refeicoesResult.rows.length}`);
    console.log(`   - Escolas ativas: ${escolasResult.rows.length}`);
    console.log(`   - Produtos na demanda: ${demandaResult.rows.length}`);
    console.log('\n📧 Para suporte, entre em contato com o desenvolvedor.');

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error);
  } finally {
    await db.pool.end();
  }
}

testarGeracaoGuias();
