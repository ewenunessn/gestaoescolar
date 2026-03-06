/**
 * Script para testar as otimizações implementadas
 * - Rate limiting
 * - Cache
 * - Compressão
 * - Paginação
 * - Monitoramento
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testOptimizations() {
  console.log('🧪 Testando Otimizações do Sistema\n');
  console.log('='.repeat(60));

  // 1. Testar Rate Limiting
  console.log('\n1️⃣  Testando Rate Limiting...');
  try {
    const requests = [];
    for (let i = 0; i < 5; i++) {
      requests.push(axios.get(`${BASE_URL}/api/escolas`));
    }
    
    const responses = await Promise.all(requests);
    const lastResponse = responses[responses.length - 1];
    
    console.log(`   ✅ ${responses.length} requisições bem-sucedidas`);
    console.log(`   📊 Rate Limit: ${lastResponse.headers['x-ratelimit-remaining']}/${lastResponse.headers['x-ratelimit-limit']}`);
    console.log(`   ⏰ Reset: ${lastResponse.headers['x-ratelimit-reset']}`);
  } catch (error) {
    if (error.response?.status === 429) {
      console.log('   ⚠️  Rate limit atingido (esperado após muitas requisições)');
      console.log(`   ⏰ Retry After: ${error.response.headers['retry-after']} segundos`);
    } else {
      console.log('   ❌ Erro:', error.message);
    }
  }

  // 2. Testar Cache
  console.log('\n2️⃣  Testando Cache...');
  try {
    // Primeira requisição (MISS)
    const start1 = Date.now();
    const response1 = await axios.get(`${BASE_URL}/api/produtos`);
    const time1 = Date.now() - start1;
    
    console.log(`   📥 Primeira requisição: ${time1}ms`);
    console.log(`   🔍 Cache: ${response1.headers['x-cache']}`);
    
    // Segunda requisição (HIT)
    await new Promise(resolve => setTimeout(resolve, 100));
    const start2 = Date.now();
    const response2 = await axios.get(`${BASE_URL}/api/produtos`);
    const time2 = Date.now() - start2;
    
    console.log(`   📥 Segunda requisição: ${time2}ms`);
    console.log(`   🔍 Cache: ${response2.headers['x-cache']}`);
    console.log(`   ⏱️  Cache Age: ${response2.headers['x-cache-age']}s`);
    
    if (time2 < time1) {
      console.log(`   ✅ Cache funcionando! ${Math.round((1 - time2/time1) * 100)}% mais rápido`);
    }
  } catch (error) {
    console.log('   ❌ Erro:', error.message);
  }

  // 3. Testar Compressão
  console.log('\n3️⃣  Testando Compressão...');
  try {
    const response = await axios.get(`${BASE_URL}/api/escolas`, {
      headers: { 'Accept-Encoding': 'gzip' }
    });
    
    const originalSize = parseInt(response.headers['x-original-size'] || '0');
    const compressedSize = parseInt(response.headers['x-compressed-size'] || '0');
    const ratio = response.headers['x-compression-ratio'];
    
    console.log(`   📦 Tamanho original: ${(originalSize / 1024).toFixed(2)} KB`);
    console.log(`   🗜️  Tamanho comprimido: ${(compressedSize / 1024).toFixed(2)} KB`);
    console.log(`   📊 Taxa de compressão: ${ratio}`);
    console.log(`   ✅ Compressão: ${response.headers['x-compression']}`);
  } catch (error) {
    console.log('   ❌ Erro:', error.message);
  }

  // 4. Testar Paginação
  console.log('\n4️⃣  Testando Paginação...');
  try {
    const response = await axios.get(`${BASE_URL}/api/escolas?page=1&limit=5`);
    const data = response.data;
    
    if (data.meta) {
      console.log(`   📄 Página: ${data.meta.page}/${data.meta.totalPages}`);
      console.log(`   📊 Itens: ${data.data.length}/${data.meta.total}`);
      console.log(`   ⬅️  Anterior: ${data.meta.hasPrev ? 'Sim' : 'Não'}`);
      console.log(`   ➡️  Próxima: ${data.meta.hasNext ? 'Sim' : 'Não'}`);
      console.log('   ✅ Paginação funcionando!');
    } else {
      console.log('   ⚠️  Resposta não paginada (pode ser normal)');
    }
  } catch (error) {
    console.log('   ❌ Erro:', error.message);
  }

  // 5. Testar Monitoramento
  console.log('\n5️⃣  Testando Monitoramento...');
  try {
    // Health check
    const health = await axios.get(`${BASE_URL}/api/monitoring/health`);
    console.log(`   ❤️  Status: ${health.data.status}`);
    console.log(`   🗄️  Banco: ${health.data.database.connected ? 'Conectado' : 'Desconectado'}`);
    console.log(`   ⏱️  Uptime: ${Math.floor(health.data.uptime / 60)} minutos`);
    
    // Stats
    const stats = await axios.get(`${BASE_URL}/api/monitoring/stats`);
    console.log(`   💾 Memória: ${stats.data.memory.heapUsed}/${stats.data.memory.heapTotal} MB`);
    console.log(`   📦 Cache: ${stats.data.cache.active} ativos, ${stats.data.cache.sizeMB} MB`);
    console.log(`   🚦 Rate Limit: ${stats.data.rateLimit.activeKeys} IPs ativos`);
    
    // Performance
    const perf = await axios.get(`${BASE_URL}/api/monitoring/performance`);
    console.log(`   ⚡ Latência DB: ${perf.data.metrics.database.latency}ms (${perf.data.metrics.database.status})`);
    console.log('   ✅ Monitoramento funcionando!');
  } catch (error) {
    console.log('   ❌ Erro:', error.message);
  }

  // Resumo Final
  console.log('\n' + '='.repeat(60));
  console.log('✅ Testes de Otimização Concluídos!\n');
  console.log('📊 Endpoints de Monitoramento:');
  console.log(`   • Health: ${BASE_URL}/api/monitoring/health`);
  console.log(`   • Stats: ${BASE_URL}/api/monitoring/stats`);
  console.log(`   • Performance: ${BASE_URL}/api/monitoring/performance`);
  console.log('\n📚 Documentação: docs/MELHORIAS-MEDIO-PRAZO.md\n');
}

// Executar
testOptimizations().catch(console.error);
