const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testResolveTenant() {
  console.log('🧪 Testando /tenants/resolve...\n');
  
  try {
    // 1. Fazer login
    console.log('🔐 Fazendo login...');
    const loginResponse = await axios.post('https://gestaoescolar-backend.vercel.app/api/auth/login', {
      email: 'ewertonsolon@gmail.com',
      senha: '123456'
    });

    const token = loginResponse.data.token;
    const decoded = jwt.decode(token);
    console.log('✅ Login realizado!');
    console.log('📊 Token decodificado:');
    console.log(JSON.stringify(decoded, null, 2));
    console.log();

    // 2. Chamar /tenants/resolve
    console.log('🔄 Chamando /tenants/resolve...');
    
    const resolveResponse = await axios.get(
      'https://gestaoescolar-backend.vercel.app/api/tenants/resolve',
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('✅ Resposta de /tenants/resolve:');
    console.log(JSON.stringify(resolveResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
    if (error.response) {
      console.log('📊 Status:', error.response.status);
    }
  }
}

testResolveTenant();
