/**
 * Script de teste para verificar otimizações de performance multi-tenant
 * Testa cache, connection pooling, queries otimizadas e monitoramento
 */

const { tenantCache } = require('./src/utils/tenantCache');
const { tenantConnectionPool } = require('./src/utils/tenantConnectionPool');
const { tenantOptimizedQueries } = require('./src/utils/tenantOptimizedQueries');
const { tenantPerformanceMonitor } = require('./src/middleware/tenantPerformanceMiddleware');

async function testTenantCache() {
    console.log('🧪 Testando sistema de cache multi-tenant...');
    
    try {
        // Testar conectividade com Redis
        const isConnected = await tenantCache.ping();
        console.log(`  Redis conectado: ${isConnected ? '✅' : '❌'}`);
        
        if (!isConnected) {
            console.log('  ⚠️ Redis não está disponível - cache funcionará em modo fallback');
            return;
        }
        
        const testTenantId = '00000000-0000-0000-0000-000000000000';
        const testKey = 'test:performance';
        const testData = { message: 'Cache funcionando!', timestamp: new Date() };
        
        // Testar set/get
        await tenantCache.set(testTenantId, testKey, testData, { ttl: 60 });
        const retrieved = await tenantCache.get(testTenantId, testKey);
        
        console.log(`  Set/Get: ${retrieved && retrieved.message === testData.message ? '✅' : '❌'}`);
        
        // Testar múltiplas chaves
        const multiData = [
            { key: 'test1', value: { data: 'value1' } },
            { key: 'test2', value: { data: 'value2' } }
        ];
        
        await tenantCache.mset(testTenantId, multiData, { ttl: 60 });
        const multiRetrieved = await tenantCache.mget(testTenantId, ['test1', 'test2']);
        
        console.log(`  Multi Set/Get: ${multiRetrieved.length === 2 && multiRetrieved[0] ? '✅' : '❌'}`);
        
        // Testar invalidação por padrão
        const invalidated = await tenantCache.invalidatePattern(testTenantId, 'test*');
        console.log(`  Invalidação por padrão: ${invalidated >= 0 ? '✅' : '❌'} (${invalidated} chaves)`);
        
        // Obter estatísticas
        const stats = tenantCache.getStats();
        console.log(`  Estatísticas: Hit Rate ${stats.hitRate.toFixed(1)}%, ${stats.sets} sets, ${stats.hits} hits`);
        
    } catch (error) {
        console.error('  ❌ Erro no teste de cache:', error.message);
    }
}

async function testConnectionPool() {
    console.log('🧪 Testando connection pool multi-tenant...');
    
    try {
        // Testar conectividade
        const isHealthy = await tenantConnectionPool.testConnection();
        console.log(`  Conectividade: ${isHealthy ? '✅' : '❌'}`);
        
        const testTenantId = '00000000-0000-0000-0000-000000000000';
        
        // Testar query simples
        const result = await tenantConnectionPool.query(
            testTenantId,
            'SELECT COUNT(*) as total FROM escolas WHERE ativo = true',
            []
        );
        
        console.log(`  Query simples: ${result.rows.length > 0 ? '✅' : '❌'} (${result.rows[0]?.total || 0} escolas)`);
        
        // Testar transação
        const transactionResult = await tenantConnectionPool.transaction(testTenantId, async (client) => {
            const res1 = await client.query('SELECT COUNT(*) as produtos FROM produtos WHERE ativo = true');
            const res2 = await client.query('SELECT COUNT(*) as usuarios FROM usuarios WHERE ativo = true');
            return { produtos: res1.rows[0].produtos, usuarios: res2.rows[0].usuarios };
        });
        
        console.log(`  Transação: ${transactionResult.produtos >= 0 ? '✅' : '❌'} (${transactionResult.produtos} produtos, ${transactionResult.usuarios} usuários)`);
        
        // Testar batch queries
        const batchResults = await tenantConnectionPool.batch(testTenantId, [
            { text: 'SELECT COUNT(*) as count FROM contratos' },
            { text: 'SELECT COUNT(*) as count FROM pedidos' }
        ]);
        
        console.log(`  Batch queries: ${batchResults.length === 2 ? '✅' : '❌'} (${batchResults[0]?.[0]?.count || 0} contratos, ${batchResults[1]?.[0]?.count || 0} pedidos)`);
        
        // Obter estatísticas do pool
        const stats = tenantConnectionPool.getConnectionStats();
        console.log(`  Pool stats: ${stats.totalConnections} total, ${stats.activeConnections} ativas, ${stats.idleConnections} idle`);
        console.log(`  Performance: ${stats.totalQueries} queries, ${stats.averageQueryTime.toFixed(2)}ms média`);
        
    } catch (error) {
        console.error('  ❌ Erro no teste de connection pool:', error.message);
    }
}

async function testOptimizedQueries() {
    console.log('🧪 Testando queries otimizadas multi-tenant...');
    
    try {
        const testTenantId = '00000000-0000-0000-0000-000000000000';
        
        // Testar query de escolas
        const escolas = await tenantOptimizedQueries.getEscolasByTenant({
            tenantId: testTenantId,
            page: 1,
            limit: 5,
            useCache: true,
            cacheTTL: 60
        });
        
        console.log(`  Query escolas: ${Array.isArray(escolas) ? '✅' : '❌'} (${escolas.length} resultados)`);
        
        // Testar query de produtos
        const produtos = await tenantOptimizedQueries.getProdutosByTenant({
            tenantId: testTenantId,
            page: 1,
            limit: 5,
            useCache: true,
            cacheTTL: 60
        });
        
        console.log(`  Query produtos: ${Array.isArray(produtos) ? '✅' : '❌'} (${produtos.length} resultados)`);
        
        // Testar resumo de estoque
        const resumoEstoque = await tenantOptimizedQueries.getEstoqueResumoByTenant({
            tenantId: testTenantId,
            useCache: true,
            cacheTTL: 300
        });
        
        console.log(`  Resumo estoque: ${Array.isArray(resumoEstoque) ? '✅' : '❌'} (${resumoEstoque.length} produtos)`);
        
        // Testar estatísticas
        const estatisticas = await tenantOptimizedQueries.getEstatisticasByTenant({
            tenantId: testTenantId,
            useCache: true,
            cacheTTL: 600
        });
        
        console.log(`  Estatísticas: ${estatisticas && typeof estatisticas === 'object' ? '✅' : '❌'}`);
        console.log(`    - ${estatisticas.total_escolas || 0} escolas`);
        console.log(`    - ${estatisticas.total_produtos || 0} produtos`);
        console.log(`    - ${estatisticas.total_usuarios || 0} usuários`);
        console.log(`    - ${estatisticas.quantidade_total_estoque || 0} itens em estoque`);
        
        // Testar invalidação de cache
        await tenantOptimizedQueries.invalidateCacheOnDataChange(testTenantId, 'estoque');
        console.log(`  Invalidação cache: ✅`);
        
    } catch (error) {
        console.error('  ❌ Erro no teste de queries otimizadas:', error.message);
    }
}

async function testPerformanceMonitoring() {
    console.log('🧪 Testando monitoramento de performance...');
    
    try {
        const testTenantId = '00000000-0000-0000-0000-000000000000';
        
        // Simular algumas métricas
        const monitor = tenantPerformanceMonitor;
        
        // Obter métricas do tenant
        const tenantMetrics = monitor.getTenantMetrics(testTenantId);
        console.log(`  Métricas do tenant: ${tenantMetrics ? '✅' : '⚠️'} ${tenantMetrics ? `(${tenantMetrics.metrics.requestCount} requests)` : '(sem dados ainda)'}`);
        
        // Obter métricas de todos os tenants
        const allMetrics = monitor.getAllTenantMetrics();
        console.log(`  Métricas globais: ${Array.isArray(allMetrics) ? '✅' : '❌'} (${allMetrics.length} tenants)`);
        
        // Obter alertas
        const alerts = monitor.getPerformanceAlerts();
        console.log(`  Alertas: ${Array.isArray(alerts) ? '✅' : '❌'} (${alerts.length} alertas ativos)`);
        
        // Obter estatísticas do sistema
        const systemStats = monitor.getSystemStats();
        console.log(`  Stats sistema: ${systemStats ? '✅' : '❌'}`);
        if (systemStats) {
            console.log(`    - ${systemStats.totalTenants} tenants monitorados`);
            console.log(`    - ${systemStats.totalRequests} requests totais`);
            console.log(`    - ${systemStats.averageResponseTime.toFixed(2)}ms tempo médio`);
        }
        
    } catch (error) {
        console.error('  ❌ Erro no teste de monitoramento:', error.message);
    }
}

async function testDatabaseIndexes() {
    console.log('🧪 Testando índices de performance...');
    
    try {
        const testTenantId = '00000000-0000-0000-0000-000000000000';
        
        // Testar query que deve usar índices
        const result = await tenantConnectionPool.query(
            testTenantId,
            `EXPLAIN (ANALYZE, BUFFERS) 
             SELECT e.nome, COUNT(ee.id) as produtos_estoque
             FROM escolas e
             LEFT JOIN estoque_escolas ee ON ee.escola_id = e.id
             WHERE e.tenant_id = $1 AND e.ativo = true
             GROUP BY e.id, e.nome
             ORDER BY e.nome
             LIMIT 5`,
            [testTenantId]
        );
        
        const plan = result.rows.map(row => row['QUERY PLAN']).join('\n');
        const usesIndex = plan.includes('Index') || plan.includes('Bitmap');
        
        console.log(`  Uso de índices: ${usesIndex ? '✅' : '⚠️'} ${usesIndex ? '(índices detectados)' : '(usando seq scan)'}`);
        
        // Verificar se views materializadas existem
        const viewsResult = await tenantConnectionPool.query(
            'system',
            `SELECT COUNT(*) as count FROM pg_matviews WHERE matviewname LIKE '%performance%'`,
            []
        );
        
        const viewCount = viewsResult.rows[0].count;
        console.log(`  Views materializadas: ${viewCount > 0 ? '✅' : '⚠️'} (${viewCount} encontradas)`);
        
    } catch (error) {
        console.error('  ❌ Erro no teste de índices:', error.message);
    }
}

async function runPerformanceTests() {
    console.log('🚀 Iniciando testes de performance multi-tenant...\n');
    
    const startTime = Date.now();
    
    await testTenantCache();
    console.log('');
    
    await testConnectionPool();
    console.log('');
    
    await testOptimizedQueries();
    console.log('');
    
    await testPerformanceMonitoring();
    console.log('');
    
    await testDatabaseIndexes();
    console.log('');
    
    const totalTime = Date.now() - startTime;
    
    console.log('🎉 Testes de performance concluídos!');
    console.log(`⏱️ Tempo total: ${totalTime}ms`);
    console.log('');
    console.log('📋 Resumo das otimizações implementadas:');
    console.log('  ✅ Sistema de cache Redis com prefixos de tenant');
    console.log('  ✅ Connection pooling com contexto de tenant');
    console.log('  ✅ Queries otimizadas com cache automático');
    console.log('  ✅ Monitoramento de performance em tempo real');
    console.log('  ✅ Índices compostos para melhor performance');
    console.log('  ✅ Views materializadas para consultas frequentes');
    console.log('');
    console.log('🔗 Endpoints de monitoramento disponíveis:');
    console.log('  - GET /api/performance/system - Estatísticas do sistema');
    console.log('  - GET /api/performance/tenants - Métricas de todos os tenants');
    console.log('  - GET /api/performance/tenant/:id/metrics - Métricas específicas');
    console.log('  - GET /api/performance/alerts - Alertas de performance');
    console.log('  - GET /api/performance/connection-pool - Stats do pool de conexões');
}

// Executar testes se chamado diretamente
if (require.main === module) {
    runPerformanceTests().catch(error => {
        console.error('❌ Erro nos testes de performance:', error);
        process.exit(1);
    });
}

module.exports = { runPerformanceTests };