/**
 * Test script for tenant inventory caching system
 * Tests both in-memory and Redis caching functionality
 */

const { 
  cacheTenantEstoqueResumo,
  cacheTenantEstoqueEscola,
  cacheTenantEstoqueProduto,
  cacheTenantEstoqueLotes,
  cacheTenantMovimentacoes,
  cacheTenantProdutos,
  invalidateTenantCacheOnEstoqueChange,
  withTenantCache
} = require('./src/utils/tenantInventoryCache');

const { 
  redisCacheTenantInventory,
  getRedisTenantCache,
  createRedisTenantCache
} = require('./src/utils/redisTenantCache');

const { 
  initializeRedisCache,
  getCacheConfiguration,
  getCacheStats
} = require('./src/config/redis');

async function testInMemoryCache() {
  console.log('\n🧪 Testing In-Memory Tenant Cache...');
  
  const testTenantId = 'test-tenant-123';
  const testData = {
    escola_id: 1,
    produtos: [
      { id: 1, nome: 'Produto A', quantidade: 100 },
      { id: 2, nome: 'Produto B', quantidade: 50 }
    ]
  };

  try {
    // Test setting cache
    console.log('📦 Setting cache data...');
    await cacheTenantEstoqueEscola.set(testTenantId, 1, testData);
    
    // Test getting cache
    console.log('🎯 Getting cache data...');
    const cachedData = await cacheTenantEstoqueEscola.get(testTenantId, 1);
    
    if (cachedData && JSON.stringify(cachedData) === JSON.stringify(testData)) {
      console.log('✅ In-memory cache set/get working correctly');
    } else {
      console.log('❌ In-memory cache set/get failed');
      console.log('Expected:', testData);
      console.log('Got:', cachedData);
    }

    // Test cache invalidation
    console.log('🗑️ Testing cache invalidation...');
    invalidateTenantCacheOnEstoqueChange(testTenantId, {
      operation: 'movement',
      escolaId: 1,
      produtoId: 1
    });
    
    const invalidatedData = await cacheTenantEstoqueEscola.get(testTenantId, 1);
    if (!invalidatedData) {
      console.log('✅ Cache invalidation working correctly');
    } else {
      console.log('❌ Cache invalidation failed - data still present');
    }

    // Test withTenantCache helper
    console.log('🔄 Testing withTenantCache helper...');
    let fetchCallCount = 0;
    
    const fetchFunction = async () => {
      fetchCallCount++;
      return { data: 'test-data', timestamp: Date.now() };
    };

    // First call should fetch
    const result1 = await withTenantCache(testTenantId, 'test-operation', {}, fetchFunction, 1);
    
    // Second call should use cache
    const result2 = await withTenantCache(testTenantId, 'test-operation', {}, fetchFunction, 1);
    
    if (fetchCallCount === 1 && result1.data === result2.data) {
      console.log('✅ withTenantCache helper working correctly');
    } else {
      console.log('❌ withTenantCache helper failed');
      console.log('Fetch calls:', fetchCallCount, 'Expected: 1');
    }

  } catch (error) {
    console.error('❌ In-memory cache test failed:', error);
  }
}

async function testRedisCache() {
  console.log('\n🧪 Testing Redis Tenant Cache...');
  
  try {
    // Initialize Redis cache
    console.log('🔧 Initializing Redis cache...');
    await initializeRedisCache();
    
    const redisCache = getRedisTenantCache();
    if (!redisCache) {
      console.log('⚠️ Redis cache not available, skipping Redis tests');
      return;
    }

    if (!redisCache.isConnected()) {
      console.log('⚠️ Redis not connected, skipping Redis tests');
      return;
    }

    const testTenantId = 'redis-test-tenant-456';
    const testData = {
      resumo: {
        total_produtos: 10,
        produtos_com_estoque: 8,
        produtos_sem_estoque: 2
      }
    };

    // Test Redis cache operations
    console.log('📦 Testing Redis cache set/get...');
    await redisCacheTenantInventory.cacheResumo(testTenantId, testData, 1);
    
    const cachedResumo = await redisCacheTenantInventory.getResumo(testTenantId);
    
    if (cachedResumo && JSON.stringify(cachedResumo) === JSON.stringify(testData)) {
      console.log('✅ Redis cache set/get working correctly');
    } else {
      console.log('❌ Redis cache set/get failed');
      console.log('Expected:', testData);
      console.log('Got:', cachedResumo);
    }

    // Test Redis cache invalidation
    console.log('🗑️ Testing Redis cache invalidation...');
    const invalidated = await redisCacheTenantInventory.invalidateInventoryChange(testTenantId, {
      operation: 'all'
    });
    
    if (invalidated > 0) {
      console.log(`✅ Redis cache invalidation working correctly (${invalidated} entries cleared)`);
    } else {
      console.log('⚠️ Redis cache invalidation returned 0 entries');
    }

    // Test Redis cache statistics
    console.log('📊 Testing Redis cache statistics...');
    const stats = await redisCache.getTenantStats(testTenantId);
    console.log('Redis stats:', stats);

  } catch (error) {
    console.error('❌ Redis cache test failed:', error);
  }
}

async function testCacheConfiguration() {
  console.log('\n🧪 Testing Cache Configuration...');
  
  try {
    const config = getCacheConfiguration();
    console.log('📋 Cache configuration:', JSON.stringify(config, null, 2));
    
    const stats = await getCacheStats();
    console.log('📊 Cache stats:', JSON.stringify(stats, null, 2));
    
    console.log('✅ Cache configuration test completed');
  } catch (error) {
    console.error('❌ Cache configuration test failed:', error);
  }
}

async function testCachePerformance() {
  console.log('\n🧪 Testing Cache Performance...');
  
  const testTenantId = 'perf-test-tenant-789';
  const iterations = 100;
  
  try {
    // Test in-memory cache performance
    console.log(`⚡ Testing in-memory cache performance (${iterations} operations)...`);
    
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      const testData = { iteration: i, timestamp: Date.now() };
      await cacheTenantEstoqueProduto.set(testTenantId, i, testData);
      await cacheTenantEstoqueProduto.get(testTenantId, i);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const opsPerSecond = Math.round((iterations * 2) / (duration / 1000));
    
    console.log(`✅ In-memory cache performance: ${duration}ms for ${iterations * 2} operations (${opsPerSecond} ops/sec)`);
    
    // Clean up
    invalidateTenantCacheOnEstoqueChange(testTenantId);
    
  } catch (error) {
    console.error('❌ Cache performance test failed:', error);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Tenant Inventory Cache Tests...');
  console.log('=' .repeat(60));
  
  await testInMemoryCache();
  await testRedisCache();
  await testCacheConfiguration();
  await testCachePerformance();
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 All cache tests completed!');
  
  // Close Redis connection if it exists
  const redisCache = getRedisTenantCache();
  if (redisCache) {
    try {
      await redisCache.close();
      console.log('🔌 Redis connection closed');
    } catch (error) {
      console.warn('⚠️ Error closing Redis connection:', error);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testInMemoryCache,
  testRedisCache,
  testCacheConfiguration,
  testCachePerformance,
  runAllTests
};