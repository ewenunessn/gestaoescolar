const axios = require('axios');

async function testLogin() {
  try {
    console.log('🔐 Testando login via API...\n');

    const response = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'joao.silva@exemplo.gov.br',
      senha: 'Senha@123'
    });

    console.log('✅ Login bem-sucedido!\n');
    console.log('Resposta completa:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ Erro no login:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Mensagem:', error.response.data.message);
      console.error('Dados:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

testLogin();
