const axios = require('axios');

async function testLocal() {
  try {
    console.log('🔐 Testando login local...');
    
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'ewenunes0@gmail.com',
      senha: '@Nunes8922'
    });
    
    console.log('✅ Login response:', loginResponse.data);
    
    const token = loginResponse.data.token;
    console.log('🔐 Token recebido:', token.substring(0, 20) + '...');
    
    // Testar buscar usuário
    console.log('👤 Testando buscar usuário...');
    const userResponse = await axios.get('http://localhost:3000/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ User response:', userResponse.data);
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 O servidor local não está rodando. Inicie com: npm run dev');
    }
  }
}

testLocal();