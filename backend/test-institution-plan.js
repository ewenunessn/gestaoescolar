const axios = require('axios');

const API_URL = 'https://gestaoescolar-backend-seven.vercel.app/api';

async function testInstitutionPlan() {
  try {
    console.log('🧪 Testando endpoint de instituição...\n');

    // 1. Fazer login
    console.log('🔐 Fazendo login...');
    const loginResponse = await axios.post(`${API_URL}/system-admin/auth/login`, {
      email: 'admin@sistema.com',
      password: 'Admin@123'
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Login realizado!\n');

    // 2. Buscar instituição
    const institutionId = '069c3667-4279-4d63-b771-bb2bc1c9d833'; // teste-fix
    
    console.log(`📤 Buscando instituição ${institutionId}...`);
    const response = await axios.get(`${API_URL}/institutions/${institutionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Resposta recebida!\n');
    console.log('📊 Dados da instituição:');
    console.log(JSON.stringify(response.data.data, null, 2));
    
    if (response.data.data.plan_name) {
      console.log('\n✅ plan_name está presente:', response.data.data.plan_name);
    } else {
      console.log('\n❌ plan_name NÃO está presente');
      console.log('   plan_id:', response.data.data.plan_id);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📊 Dados:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testInstitutionPlan();
