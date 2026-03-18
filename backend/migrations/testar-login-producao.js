const axios = require('axios');

async function testarLogin() {
  try {
    console.log('🔐 Testando login na API de produção...\n');

    const email = 'ewenunes0@gmail.com';
    const senha = '@Nunes8922';

    console.log('📧 Email:', email);
    console.log('🔒 Senha:', '***********');
    console.log('🌐 URL:', 'https://gestaoescolar-backend.vercel.app/api/auth/login\n');

    const response = await axios.post(
      'https://gestaoescolar-backend.vercel.app/api/auth/login',
      { email, senha },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Login realizado com sucesso!\n');
    console.log('📊 Resposta:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n🎫 Token:', response.data.data?.token?.substring(0, 50) + '...');
    console.log('👤 Nome:', response.data.data?.nome);
    console.log('🏷️ Tipo:', response.data.data?.tipo);
    console.log('🏫 Escola ID:', response.data.data?.escola_id || 'Nenhuma');
    console.log('📋 Tipo Secretaria:', response.data.data?.tipo_secretaria);

  } catch (error) {
    console.error('❌ Erro no login:\n');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', JSON.stringify(error.response.data, null, 2));
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('Nenhuma resposta recebida do servidor');
      console.error('Request:', error.request);
    } else {
      console.error('Erro:', error.message);
    }
  }
}

testarLogin();
