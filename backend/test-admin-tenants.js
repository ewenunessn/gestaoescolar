const axios = require('axios');

const API_URL = 'https://gestaoescolar-backend-seven.vercel.app';

async function testAdminTenants() {
  console.log('🧪 Testando endpoint de tenants...\n');

  try {
    // Fazer login
    console.log('1️⃣ Fazendo login como admin...');
    const loginResponse = await axios.post(`${API_URL}/api/system-admin/auth/login`, {
      email: 'admin',
      password: 'admin123'
    });

    const token = loginResponse.data.data.token;
    console.log(`✅ Login realizado. Token: ${token.substring(0, 20)}...\n`);

    // Listar tenants
    console.log('2️⃣ Listando tenants...');
    const tenantsResponse = await axios.get(`${API_URL}/api/system-admin/data/tenants`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Resposta recebida:');
    console.log(JSON.stringify(tenantsResponse.data, null, 2));

  } catch (error) {
    console.log('❌ Erro:', error.response?.status);
    console.log('Mensagem:', error.response?.data);
    console.log('Stack:', error.response?.data?.stack);
  }
}

testAdminTenants();
