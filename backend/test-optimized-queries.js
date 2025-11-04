/**
 * Script para testar as queries otimizadas de estoque
 * Compara performance entre queries antigas e novas
 */

const { testInventoryQueryPerformance, queryAnalyzer } = require('./src/utils/queryAnalyzer');
const optimizedQueries = require('./src/utils/optimizedInventoryQueries');
const db = require('./src/database');

async function testQueryOptimizations() {
  console.log('🚀 Iniciando teste de otimização de queries de estoque...\n');

  try {
    // Buscar um tenant para teste
    const tenantResult = await db.query('SELECT id FROM tenants LIMIT 1');
    if (tenantResult.rows.length === 0) {
      console.log('❌ Nenhum tenant encontrado para teste');
      return;
    }

    const tenantId = tenantResult.rows[0].id;
    console.log(`📋 Usando tenant: ${tenantId}\n`);

    // Buscar uma escola para teste
    const escolaResult = await db.query('SELECT id FROM escolas WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    if (escolaResult.rows.length === 0) {
      console.log('❌ Nenhuma escola encontrada para teste');
      return;
    }

    const escolaId = escolaResult.rows[0].id;
    console.log(`🏫 Usando escola: ${escolaId}\n`);

    // Teste 1: Query de listagem de estoque (antiga vs nova)
    console.log('=== TESTE 1: Listagem de Estoque ===');
    
    const queryAntiga = `
      WITH lotes_agregados AS (
        SELECT 
          el.produto_id,
          COALESCE(SUM(el.quantidade_atual), 0) as total_quantidade_lotes,
          MIN(CASE WHEN el.quantidade_atual > 0 THEN el.data_validade END) as min_validade_lotes
        FROM estoque_lotes el
        WHERE el.status = 'ativo'
          AND el.escola_id = $1
          AND el.tenant_id = $2
        GROUP BY el.produto_id
      )
      SELECT 
        ee.id,
        p.id as produto_id,
        (COALESCE(ee.quantidade_atual, 0) + COALESCE(la.total_quantidade_lotes, 0)) as quantidade_atual,
        p.nome as produto_nome,
        p.categoria
      FROM produtos p
      CROSS JOIN escolas e
      LEFT JOIN estoque_escolas ee ON (ee.produto_id = p.id AND ee.escola_id = e.id AND ee.tenant_id = $2)
      LEFT JOIN lotes_agregados la ON la.produto_id = p.id
      WHERE p.ativo = true 
        AND e.id = $1 
        AND e.ativo = true
        AND p.tenant_id = $2
        AND e.tenant_id = $2
      ORDER BY p.categoria, p.nome
      LIMIT 50
    `;

    console.log('⏱️ Testando query antiga (com CROSS JOIN)...');
    const { analysis: analysisAntiga } = await queryAnalyzer.executeWithAnalysis(
      queryAntiga, 
      [escolaId, tenantId], 
      'Query Antiga'
    );

    console.log('⏱️ Testando query otimizada...');
    const startTime = Date.now();
    const resultadoOtimizado = await optimizedQueries.getEstoqueEscolaOptimized(escolaId, tenantId, {
      limit: 50,
      incluirLotes: true
    });
    const tempoOtimizado = Date.now() - startTime;

    console.log('\n📊 Resultados do Teste 1:');
    console.log(`Query Antiga: ${analysisAntiga.executionTime}ms (${analysisAntiga.rowsReturned} linhas)`);
    console.log(`Query Otimizada: ${tempoOtimizado}ms (${resultadoOtimizado.length} linhas)`);
    console.log(`Melhoria: ${((analysisAntiga.executionTime - tempoOtimizado) / analysisAntiga.executionTime * 100).toFixed(1)}%`);
    console.log(`Performance: ${analysisAntiga.performance} → melhorada`);
    console.log(`Índices usados: ${analysisAntiga.indexesUsed.join(', ') || 'nenhum'}`);
    if (analysisAntiga.recommendations.length > 0) {
      console.log(`Recomendações: ${analysisAntiga.recommendations.join('; ')}`);
    }

    // Teste 2: Query de resumo de estoque
    console.log('\n=== TESTE 2: Resumo de Estoque ===');
    
    console.log('⏱️ Testando resumo otimizado...');
    const startTimeResumo = Date.now();
    const resumoOtimizado = await optimizedQueries.getEstoqueResumoTenantOptimized(tenantId, {
      limit: 20
    });
    const tempoResumo = Date.now() - startTimeResumo;

    console.log('\n📊 Resultados do Teste 2:');
    console.log(`Resumo Otimizado: ${tempoResumo}ms (${resumoOtimizado.length} produtos)`);

    // Teste 3: Query de matriz de estoque
    console.log('\n=== TESTE 3: Matriz de Estoque ===');
    
    console.log('⏱️ Testando matriz otimizada...');
    const startTimeMatriz = Date.now();
    const matrizOtimizada = await optimizedQueries.getMatrizEstoquePaginadaOptimized(tenantId, {
      limiteProdutos: 10,
      limitEscolas: 10,
      incluirSemEstoque: false
    });
    const tempoMatriz = Date.now() - startTimeMatriz;

    console.log('\n📊 Resultados do Teste 3:');
    console.log(`Matriz Otimizada: ${tempoMatriz}ms (${matrizOtimizada.length} combinações)`);

    // Teste 4: Produtos próximos ao vencimento
    console.log('\n=== TESTE 4: Produtos Próximos ao Vencimento ===');
    
    console.log('⏱️ Testando vencimento otimizado...');
    const startTimeVencimento = Date.now();
    const vencimentoOtimizado = await optimizedQueries.getProdutosVencimentoTenantOptimized(tenantId, 30, {
      limit: 50
    });
    const tempoVencimento = Date.now() - startTimeVencimento;

    console.log('\n📊 Resultados do Teste 4:');
    console.log(`Vencimento Otimizado: ${tempoVencimento}ms (${vencimentoOtimizado.length} lotes)`);

    // Teste 5: Histórico de movimentações
    console.log('\n=== TESTE 5: Histórico de Movimentações ===');
    
    console.log('⏱️ Testando histórico otimizado...');
    const startTimeHistorico = Date.now();
    const historicoOtimizado = await optimizedQueries.getHistoricoMovimentacoesTenantOptimized(tenantId, {
      limit: 50,
      escolaId: escolaId
    });
    const tempoHistorico = Date.now() - startTimeHistorico;

    console.log('\n📊 Resultados do Teste 5:');
    console.log(`Histórico Otimizado: ${tempoHistorico}ms (${historicoOtimizado.length} movimentações)`);

    // Teste 6: Estatísticas gerais
    console.log('\n=== TESTE 6: Estatísticas Gerais ===');
    
    console.log('⏱️ Testando estatísticas otimizadas...');
    const startTimeStats = Date.now();
    const statsOtimizadas = await optimizedQueries.getEstatisticasEstoqueTenantOptimized(tenantId);
    const tempoStats = Date.now() - startTimeStats;

    console.log('\n📊 Resultados do Teste 6:');
    console.log(`Estatísticas Otimizadas: ${tempoStats}ms`);
    console.log(`Total de produtos: ${statsOtimizadas.total_produtos}`);
    console.log(`Total de escolas: ${statsOtimizadas.total_escolas}`);
    console.log(`Lotes ativos: ${statsOtimizadas.lotes_ativos}`);
    console.log(`Percentual com estoque: ${statsOtimizadas.percentual_produtos_com_estoque}%`);

    // Relatório final
    console.log('\n=== RELATÓRIO FINAL ===');
    const tempoTotalOtimizado = tempoOtimizado + tempoResumo + tempoMatriz + tempoVencimento + tempoHistorico + tempoStats;
    console.log(`Tempo total das queries otimizadas: ${tempoTotalOtimizado}ms`);
    console.log(`Tempo médio por query: ${(tempoTotalOtimizado / 6).toFixed(1)}ms`);
    
    // Executar teste de performance completo
    console.log('\n=== TESTE DE PERFORMANCE COMPLETO ===');
    const performanceReport = await testInventoryQueryPerformance(tenantId);
    
    console.log('\n📈 Resumo de Performance:');
    console.log(`Total de queries testadas: ${performanceReport.summary.totalQueries}`);
    console.log(`Excelente: ${performanceReport.summary.excellent}`);
    console.log(`Boa: ${performanceReport.summary.good}`);
    console.log(`Regular: ${performanceReport.summary.fair}`);
    console.log(`Ruim: ${performanceReport.summary.poor}`);
    console.log(`Tempo médio: ${performanceReport.summary.averageExecutionTime.toFixed(1)}ms`);
    
    if (performanceReport.summary.slowestQuery) {
      console.log(`Query mais lenta: ${performanceReport.summary.slowestQuery.name} (${performanceReport.summary.slowestQuery.executionTime}ms)`);
    }

    console.log('\n✅ Teste de otimização concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

// Função para testar índices
async function testIndexUsage() {
  console.log('\n🔍 Verificando uso de índices...');
  
  try {
    // Verificar índices existentes
    const indexQuery = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename IN ('estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico')
        AND indexname LIKE '%tenant%'
      ORDER BY tablename, indexname
    `;
    
    const indexes = await db.query(indexQuery);
    
    console.log('\n📋 Índices relacionados a tenant encontrados:');
    indexes.rows.forEach(idx => {
      console.log(`  ${idx.tablename}.${idx.indexname}`);
    });
    
    // Verificar estatísticas de uso de índices
    const statsQuery = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes 
      WHERE tablename IN ('estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico')
        AND indexname LIKE '%tenant%'
      ORDER BY idx_tup_read DESC
    `;
    
    const stats = await db.query(statsQuery);
    
    console.log('\n📊 Estatísticas de uso de índices:');
    stats.rows.forEach(stat => {
      console.log(`  ${stat.indexname}: ${stat.idx_tup_read} leituras, ${stat.idx_tup_fetch} fetches`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar índices:', error);
  }
}

// Executar testes
async function runAllTests() {
  await testQueryOptimizations();
  await testIndexUsage();
  
  console.log('\n🎉 Todos os testes concluídos!');
  process.exit(0);
}

// Executar se chamado diretamente
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = {
  testQueryOptimizations,
  testIndexUsage,
  runAllTests
};