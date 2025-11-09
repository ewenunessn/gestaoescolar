const axios = require('axios');

async function testLogin() {
  try {
    console.log('🔐 Testando login do administrador...\n');

    const response = await axios.post('http://localhost:3000/api/system-admin/auth/login', {
      email: 'admin@sistema.com',
      password: 'Admin@123'
    });

    console.log('✅ Login bem-sucedido!\n');
    console.log('Token:', response.data.data.token.substring(0, 50) + '...');
    console.log('\nAdmin:', response.data.data.admin);

  } catch (error) {
    console.error('❌ Erro no login:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Mensagem:', error.response.data.message);
      console.error('Dados:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testLogin();
