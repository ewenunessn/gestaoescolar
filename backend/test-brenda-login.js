const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testBrendaLogin() {
  console.log('🧪 Testando login da Brenda...\n');
  
  try {
    console.log('🔐 Fazendo login...');
    const response = await axios.post('https://gestaoescolar-backend.vercel.app/api/auth/login', {
      email: 'ewertonsolon@gmail.com',
      senha: '123456'
    });

    console.log('✅ Login realizado!\n');

    const token = response.data.token;
    const decoded = jwt.decode(token);

    console.log('📊 Payload do token JWT:');
    console.log(JSON.stringify(decoded, null, 2));
    console.log();

    console.log('🔍 Verificações:');
    console.log('✅ id:', decoded.id);
    console.log('✅ nome:', decoded.nome);
    console.log('✅ email:', decoded.email);
    console.log('✅ tipo:', decoded.tipo);
    console.log(decoded.institution_id ? '✅' : '❌', 'institution_id:', decoded.institution_id);
    console.log(decoded.tenant ? '✅' : '⚠️', 'tenant:', decoded.tenant?.name || 'não definido');
    console.log(decoded.tenants ? '✅' : '⚠️', 'tenants disponíveis:', decoded.tenants?.length || 0);

  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
    if (error.response) {
      console.log('📊 Status:', error.response.status);
      console.log('📊 Dados:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testBrendaLogin();
