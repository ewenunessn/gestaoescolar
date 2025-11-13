const axios = require('axios');

const API_URL = 'https://gestaoescolar-backend-seven.vercel.app';
const TENANT_ID = '00000000-0000-0000-0000-000000000000'; // Sistema Principal

async function testTenantDetail() {
  console.log('🧪 Testando detalhes do tenant...\n');

  try {
    // Fazer login
    console.log('1️⃣ Fazendo login como admin...');
    const loginResponse = await axios.post(`${API_URL}/api/system-admin/auth/login`, {
      email: 'admin',
      password: 'admin123'
    });

    const token = loginResponse.data.data.token;
    console.log(`✅ Login realizado\n`);

    // Buscar detalhes do tenant
    console.log(`2️⃣ Buscando detalhes do tenant ${TENANT_ID}...`);
    const response = await axios.get(`${API_URL}/api/system-admin/data/tenants/${TENANT_ID}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Resposta recebida:');
    console.log('Tenant:', response.data.data.tenant.name);
    console.log('Escolas:', response.data.data.stats.total_escolas);
    console.log('Produtos:', response.data.data.stats.total_produtos);
    console.log('Contratos:', response.data.data.stats.total_contratos);

  } catch (error) {
    console.log('❌ Erro:', error.response?.status);
    console.log('Mensagem:', error.response?.data);
  }
}

testTenantDetail();
