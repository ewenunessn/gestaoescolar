const axios = require('axios');

async function testAPIDetailed() {
  console.log('🔍 Teste Detalhado da API do Vercel\n');
  
  const baseURL = 'https://gestaoescolar-backend-seven.vercel.app/api';
  const institutionId = 'c1c7aabd-7f03-43ab-8d6d-ff003ea9005f';
  
  // Dados do usuário
  const userData = {
    nome: 'Teste API Detalhado',
    email: `teste-${Date.now()}@example.com`,
    senha: 'senha123',
    tipo: 'usuario',
    institution_role: 'user'
  };
  
  console.log('📤 Enviando requisição POST...');
  console.log('   URL:', `${baseURL}/provisioning/institutions/${institutionId}/users`);
  console.log('   Body:', { ...userData, senha: '***' });
  
  try {
    const response = await axios.post(
      `${baseURL}/provisioning/institutions/${institutionId}/users`,
      userData,
      {
        headers: {
          'Authorization': 'Bearer TOKEN_AQUI', // Substitua pelo token real
          'Content-Type': 'application/json'
        },
        validateStatus: () => true,
        timeout: 30000
      }
    );
    
    console.log('\n📊 RESPOSTA:');
    console.log('   Status:', response.status);
    console.log('   Status Text:', response.statusText);
    console.log('\n📋 Headers:');
    Object.keys(response.headers).forEach(key => {
      console.log(`   ${key}: ${response.headers[key]}`);
    });
    console.log('\n📦 Body:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.status === 500) {
      console.log('\n❌ ERRO 500 DETECTADO!');
      if (response.data.error) {
        console.log('\n🔍 Detalhes do Erro:');
        console.log('   Mensagem:', response.data.message);
        console.log('   Erro:', response.data.error);
        console.log('   Código:', response.data.code);
        if (response.data.details) {
          console.log('\n📝 Stack Trace:');
          console.log(response.data.details);
        }
      }
    }
    
  } catch (error) {
    console.error('\n❌ ERRO NA REQUISIÇÃO:');
    if (error.code === 'ECONNABORTED') {
      console.error('   Timeout - A requisição demorou mais de 30 segundos');
    } else if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('   Nenhuma resposta recebida do servidor');
    } else {
      console.error('   Erro:', error.message);
    }
  }
}

console.log('⚠️  IMPORTANTE:');
console.log('   1. Abra o painel admin no navegador');
console.log('   2. Abra DevTools (F12) > Console');
console.log('   3. Digite: localStorage.getItem("adminToken")');
console.log('   4. Copie o token e substitua "TOKEN_AQUI" no código');
console.log('   5. Execute: node backend/test-api-detailed.js\n');

// Descomente após adicionar o token
// testAPIDetailed();
