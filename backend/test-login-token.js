const axios = require('axios');

const API_URL = 'https://gestaoescolar-backend-seven.vercel.app/api';

async function testLoginToken() {
  try {
    console.log('🧪 Testando token de login...\n');

    // Fazer login com o admin da instituição teste-fix
    console.log('🔐 Fazendo login...');
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@testefix.gov.br',
      senha: 'senha123'
    });

    console.log('✅ Login realizado!\n');

    // Decodificar token
    const token = response.data.token;
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

    console.log('📊 Payload do token JWT:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('');

    // Verificar campos importantes
    console.log('🔍 Verificações:');
    console.log('   ✅ id:', payload.id);
    console.log('   ✅ nome:', payload.nome);
    console.log('   ✅ email:', payload.email);
    console.log('   ✅ tipo:', payload.tipo);
    console.log('   ' + (payload.institution_id ? '✅' : '❌') + ' institution_id:', payload.institution_id || 'NÃO PRESENTE');
    console.log('   ✅ tenant:', payload.tenant?.name);
    console.log('   ✅ tenants disponíveis:', payload.tenants?.length || 0);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📊 Dados:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testLoginToken();
