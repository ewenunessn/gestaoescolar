const axios = require('axios');

async function testAPI() {
  try {
    console.log('🔄 Testando API de demandas...\n');
    
    const tenantId = 'f830d523-25c9-4162-b241-6599df73171b';
    const baseURL = 'http://localhost:3000/api';
    
    // Teste 1: Listar demandas
    console.log('📊 Teste 1: GET /demandas');
    const start1 = Date.now();
    try {
      const response1 = await axios.get(`${baseURL}/demandas`, {
        headers: {
          'X-Tenant-ID': tenantId
        },
        timeout: 30000
      });
      console.log(`  ✓ Status: ${response1.status}`);
      console.log(`  ✓ Tempo: ${Date.now() - start1}ms`);
      console.log(`  ✓ Demandas: ${response1.data.data?.length || 0}`);
    } catch (error) {
      console.error(`  ✗ Erro: ${error.message}`);
      if (error.code === 'ECONNABORTED') {
        console.error('  ✗ TIMEOUT!');
      }
    }
    
    console.log('');
    
    // Teste 2: Listar solicitantes
    console.log('📊 Teste 2: GET /demandas/solicitantes');
    const start2 = Date.now();
    try {
      const response2 = await axios.get(`${baseURL}/demandas/solicitantes`, {
        headers: {
          'X-Tenant-ID': tenantId
        },
        timeout: 30000
      });
      console.log(`  ✓ Status: ${response2.status}`);
      console.log(`  ✓ Tempo: ${Date.now() - start2}ms`);
      console.log(`  ✓ Solicitantes: ${response2.data.data?.length || 0}`);
    } catch (error) {
      console.error(`  ✗ Erro: ${error.message}`);
      if (error.code === 'ECONNABORTED') {
        console.error('  ✗ TIMEOUT!');
      }
    }
    
    console.log('\n✅ Testes concluídos!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testAPI();
