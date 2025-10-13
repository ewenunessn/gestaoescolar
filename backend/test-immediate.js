const axios = require('axios');

async function testImmediate() {
  try {
    console.log('🔐 Fazendo login...');
    
    const loginResponse = await axios.post('https://gestaoescolar-backend.vercel.app/api/auth/login', {
      email: 'ewenunes0@gmail.com',
      senha: '@Nunes8922'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Token recebido:', token.substring(0, 30) + '...');
    
    // Testar imediatamente com o mesmo token
    console.log('👤 Testando buscar usuário imediatamente...');
    
    try {
      const userResponse = await axios.get('https://gestaoescolar-backend.vercel.app/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Sucesso! User response:', userResponse.data);
    } catch (userError) {
      console.error('❌ Erro ao buscar usuário:', userError.response?.data);
      
      // Tentar com delay
      console.log('⏳ Tentando novamente após 2 segundos...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const userResponse2 = await axios.get('https://gestaoescolar-backend.vercel.app/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('✅ Sucesso após delay! User response:', userResponse2.data);
      } catch (userError2) {
        console.error('❌ Erro persistente:', userError2.response?.data);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro no login:', error.response?.data || error.message);
  }
}

testImmediate();