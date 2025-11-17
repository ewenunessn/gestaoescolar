const axios = require('axios');

async function testAPI() {
  try {
    console.log('🔍 Testando API de saldo modalidades...\n');
    
    const baseURL = 'http://localhost:3000/api';
    const tenantId = '1cc9b18f-2b7d-412d-bb6d-4b8055e9590f';
    
    const headers = {
      'X-Tenant-ID': tenantId,
      'Content-Type': 'application/json'
    };
    
    // Teste 1: Modalidades
    console.log('📋 Testando GET /saldo-contratos-modalidades/modalidades');
    const modalidadesResponse = await axios.get(
      `${baseURL}/saldo-contratos-modalidades/modalidades`,
      { headers, timeout: 5000 }
    );
    console.log('✅ Modalidades:', modalidadesResponse.data.length, 'encontradas\n');
    
    // Teste 2: Produtos de contratos
    console.log('📦 Testando GET /saldo-contratos-modalidades/produtos-contratos');
    const produtosResponse = await axios.get(
      `${baseURL}/saldo-contratos-modalidades/produtos-contratos`,
      { headers, timeout: 5000 }
    );
    console.log('✅ Produtos:', produtosResponse.data.length, 'encontrados\n');
    
    // Teste 3: Saldos
    console.log('💰 Testando GET /saldo-contratos-modalidades?page=1&limit=25');
    const saldosResponse = await axios.get(
      `${baseURL}/saldo-contratos-modalidades?page=1&limit=25`,
      { headers, timeout: 5000 }
    );
    console.log('✅ Saldos:', saldosResponse.data);
    
    console.log('\n✅ Todos os testes passaram!');
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error('❌ TIMEOUT - O servidor está demorando mais de 5 segundos para responder');
      console.error('   Isso indica que há um problema no middleware ou na query');
    } else if (error.response) {
      console.error('❌ Erro na resposta:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('❌ Sem resposta do servidor. O servidor está rodando?');
    } else {
      console.error('❌ Erro:', error.message);
    }
    process.exit(1);
  }
}

testAPI();
