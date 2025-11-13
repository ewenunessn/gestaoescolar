const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testSwitchTenant() {
  console.log('🧪 Testando switch de tenant...\n');
  
  try {
    // 1. Fazer login
    console.log('🔐 Fazendo login...');
    const loginResponse = await axios.post('https://gestaoescolar-backend.vercel.app/api/auth/login', {
      email: 'ewertonsolon@gmail.com',
      senha: '123456'
    });

    const token = loginResponse.data.token;
    const decoded = jwt.decode(token);
    console.log('✅ Login realizado!');
    console.log('📊 Tenant atual:', decoded.tenant?.name);
    console.log('📊 Tenant ID:', decoded.tenant?.id);
    console.log();

    // 2. Tentar fazer switch para o mesmo tenant
    console.log('🔄 Tentando switch para o tenant:', decoded.tenant?.id);
    
    try {
      const switchResponse = await axios.post(
        'https://gestaoescolar-backend.vercel.app/api/tenants/switch',
        { tenantId: decoded.tenant?.id },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Switch realizado com sucesso!');
      console.log('📊 Resposta:', JSON.stringify(switchResponse.data, null, 2));
    } catch (switchError) {
      console.error('❌ Erro no switch:', switchError.response?.data || switchError.message);
      console.log('📊 Status:', switchError.response?.status);
      console.log('📊 URL:', switchError.config?.url);
      console.log('📊 Headers:', switchError.config?.headers);
      console.log('📊 Body:', switchError.config?.data);
    }

  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

testSwitchTenant();
