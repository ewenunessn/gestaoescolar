const axios = require('axios');

async function testListInstitutions() {
  try {
    console.log('🔐 1. Fazendo login...\n');

    const loginResponse = await axios.post('http://localhost:3000/api/system-admin/auth/login', {
      email: 'admin@sistema.com',
      password: 'Admin@123'
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Login bem-sucedido!');
    console.log('Token:', token.substring(0, 50) + '...\n');

    console.log('📋 2. Listando instituições...\n');

    const institutionsResponse = await axios.get('http://localhost:3000/api/institutions', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Instituições carregadas!');
    console.log('Total:', institutionsResponse.data.total);
    console.log('Dados:', JSON.stringify(institutionsResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Erro:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Mensagem:', error.response.data.message);
      console.error('Dados:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testListInstitutions();
