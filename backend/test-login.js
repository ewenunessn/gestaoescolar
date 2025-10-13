const axios = require('axios');

async function testLogin() {
  try {
    console.log('🔐 Testando login...');
    
    const loginResponse = await axios.post('https://gestaoescolar-backend.vercel.app/api/auth/login', {
      email: 'ewenunes0@gmail.com',
      senha: '@Nunes8922'
    });
    
    console.log('✅ Login response:', loginResponse.data);
    
    const token = loginResponse.data.token;
    console.log('🔐 Token recebido:', token.substring(0, 20) + '...');
    
    // Testar buscar usuário
    console.log('👤 Testando buscar usuário...');
    const userResponse = await axios.get('https://gestaoescolar-backend.vercel.app/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ User response:', userResponse.data);
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

testLogin();