const axios = require('axios');

async function testUsuariosMe() {
  console.log('🧪 Testando /usuarios/me...\n');
  
  try {
    // 1. Fazer login com Brenda
    console.log('🔐 Fazendo login com Brenda...');
    const loginResponse = await axios.post('https://gestaoescolar-backend.vercel.app/api/auth/login', {
      email: 'ewertonsolon@gmail.com',
      senha: '123456'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login realizado!');
    console.log();

    // 2. Chamar /usuarios/me
    console.log('🔄 Chamando /usuarios/me...');
    
    const meResponse = await axios.get(
      'https://gestaoescolar-backend.vercel.app/api/usuarios/me',
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('✅ Resposta de /usuarios/me:');
    console.log(JSON.stringify(meResponse.data, null, 2));
    console.log();
    
    const userData = meResponse.data.data || meResponse.data;
    
    if (userData.institution_id) {
      console.log('✅ institution_id presente:', userData.institution_id);
    } else {
      console.log('❌ institution_id AUSENTE - backend ainda não foi atualizado!');
    }

  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
    if (error.response) {
      console.log('📊 Status:', error.response.status);
    }
  }
}

testUsuariosMe();
