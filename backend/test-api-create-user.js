const axios = require('axios');

async function testCreateUser() {
  console.log('🧪 Testando API de criação de usuário...\n');
  
  // Token do admin panel (você precisa pegar do localStorage do navegador)
  const token = 'SEU_TOKEN_AQUI'; // Substitua pelo token real
  
  const institutionId = 'c1c7aabd-7f03-43ab-8d6d-ff003ea9005f';
  
  const userData = {
    nome: 'Teste API',
    email: `teste-api-${Date.now()}@example.com`,
    senha: 'senha123',
    tipo: 'usuario',
    institution_role: 'user'
  };
  
  try {
    console.log('📤 Enviando requisição para criar usuário...');
    console.log('   URL:', `https://gestaoescolar-backend-seven.vercel.app/api/provisioning/institutions/${institutionId}/users`);
    console.log('   Dados:', { ...userData, senha: '***' });
    
    const response = await axios.post(
      `https://gestaoescolar-backend-seven.vercel.app/api/provisioning/institutions/${institutionId}/users`,
      userData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('\n✅ SUCESSO!');
    console.log('   Status:', response.status);
    console.log('   Resposta:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('\n❌ ERRO!');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Resposta:', JSON.stringify(error.response.data, null, 2));
      console.error('   Headers:', error.response.headers);
    } else if (error.request) {
      console.error('   Nenhuma resposta recebida');
      console.error('   Request:', error.request);
    } else {
      console.error('   Erro:', error.message);
    }
  }
}

// Instruções
console.log('⚠️  IMPORTANTE: Você precisa substituir o token no código!');
console.log('   1. Abra o painel admin no navegador');
console.log('   2. Abra o DevTools (F12)');
console.log('   3. Vá para Console e digite: localStorage.getItem("adminToken")');
console.log('   4. Copie o token e cole na variável "token" deste script');
console.log('   5. Execute novamente: node test-api-create-user.js\n');

// Descomente a linha abaixo após adicionar o token
// testCreateUser();
