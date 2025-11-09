const axios = require('axios');

async function testInstitutionDetail() {
  try {
    console.log('🔐 1. Fazendo login...\n');

    const loginResponse = await axios.post('http://localhost:3000/api/system-admin/auth/login', {
      email: 'admin@sistema.com',
      password: 'Admin@123'
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Login bem-sucedido!\n');

    const institutionId = '6a10d4a5-2a32-40f2-bdd8-96a99e6188a4';
    console.log(`📋 2. Buscando detalhes da instituição ${institutionId}...\n`);

    const headers = { 'Authorization': `Bearer ${token}` };

    // Buscar instituição
    console.log('GET /api/institutions/' + institutionId);
    const instResponse = await axios.get(`http://localhost:3000/api/institutions/${institutionId}`, { headers });
    console.log('✅ Instituição:', instResponse.data.data.name);

    // Buscar stats
    console.log('\nGET /api/institutions/' + institutionId + '/stats');
    const statsResponse = await axios.get(`http://localhost:3000/api/institutions/${institutionId}/stats`, { headers });
    console.log('✅ Stats:', statsResponse.data.data);

    // Buscar tenants
    console.log('\nGET /api/institutions/' + institutionId + '/tenants');
    const tenantsResponse = await axios.get(`http://localhost:3000/api/institutions/${institutionId}/tenants`, { headers });
    console.log('✅ Tenants:', tenantsResponse.data.total);

    // Buscar users
    console.log('\nGET /api/institutions/' + institutionId + '/users');
    const usersResponse = await axios.get(`http://localhost:3000/api/institutions/${institutionId}/users`, { headers });
    console.log('✅ Users:', usersResponse.data.total);

    console.log('\n✅ Todas as requisições funcionaram!');

  } catch (error) {
    console.error('\n❌ Erro:');
    if (error.response) {
      console.error('URL:', error.config.url);
      console.error('Status:', error.response.status);
      console.error('Mensagem:', error.response.data.message);
      console.error('Dados:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testInstitutionDetail();
