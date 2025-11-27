const axios = require('axios');

async function testWithAuth() {
  try {
    console.log('🔄 Testando API de demandas com autenticação...\n');
    
    const baseURL = 'http://localhost:3000/api';
    
    // Primeiro, fazer login para obter o token
    console.log('📊 Passo 1: Fazendo login...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'ewerton@gmail.com',
      senha: '123456'
    });
    
    const token = loginResponse.data.token;
    const tenantId = 'f830d523-25c9-4162-b241-6599df73171b';
    
    console.log(`  ✓ Login bem-sucedido`);
    console.log(`  ✓ Token: ${token.substring(0, 20)}...`);
    console.log('');
    
    // Teste 2: Listar demandas com autenticação
    console.log('📊 Passo 2: GET /demandas (com auth)');
    const start1 = Date.now();
    
    try {
      const response1 = await axios.get(`${baseURL}/demandas`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': tenantId
        },
        timeout: 30000
      });
      
      const duration1 = Date.now() - start1;
      console.log(`  ✓ Status: ${response1.status}`);
      console.log(`  ✓ Tempo: ${duration1}ms`);
      console.log(`  ✓ Demandas: ${response1.data.data?.length || 0}`);
      
      if (duration1 > 5000) {
        console.warn(`  ⚠️  LENTO! Tempo acima de 5 segundos`);
      }
    } catch (error) {
      const duration1 = Date.now() - start1;
      console.error(`  ✗ Erro após ${duration1}ms: ${error.message}`);
      if (error.code === 'ECONNABORTED') {
        console.error('  ✗ TIMEOUT!');
      }
      if (error.response) {
        console.error(`  ✗ Status: ${error.response.status}`);
        console.error(`  ✗ Data:`, error.response.data);
      }
    }
    
    console.log('');
    
    // Teste 3: Listar solicitantes com autenticação
    console.log('📊 Passo 3: GET /demandas/solicitantes (com auth)');
    const start2 = Date.now();
    
    try {
      const response2 = await axios.get(`${baseURL}/demandas/solicitantes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': tenantId
        },
        timeout: 30000
      });
      
      const duration2 = Date.now() - start2;
      console.log(`  ✓ Status: ${response2.status}`);
      console.log(`  ✓ Tempo: ${duration2}ms`);
      console.log(`  ✓ Solicitantes: ${response2.data.data?.length || 0}`);
      
      if (duration2 > 5000) {
        console.warn(`  ⚠️  LENTO! Tempo acima de 5 segundos`);
      }
    } catch (error) {
      const duration2 = Date.now() - start2;
      console.error(`  ✗ Erro após ${duration2}ms: ${error.message}`);
      if (error.code === 'ECONNABORTED') {
        console.error('  ✗ TIMEOUT!');
      }
      if (error.response) {
        console.error(`  ✗ Status: ${error.response.status}`);
        console.error(`  ✗ Data:`, error.response.data);
      }
    }
    
    console.log('\n✅ Testes concluídos!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testWithAuth();
