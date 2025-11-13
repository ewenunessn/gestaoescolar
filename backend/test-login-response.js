const axios = require('axios');

async function testLoginResponse() {
  console.log('🧪 Testando resposta do login...\n');
  
  try {
    const response = await axios.post('https://gestaoescolar-backend.vercel.app/api/auth/login', {
      email: 'ewertonsolon@gmail.com',
      senha: '123456'
    });

    console.log('✅ Login realizado!');
    console.log('\n📊 RESPOSTA COMPLETA:');
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log('\n🔍 VERIFICAÇÕES:');
    console.log('✅ Token presente:', !!response.data.token);
    console.log('✅ availableTenants presente:', !!response.data.availableTenants);
    console.log('✅ availableTenants é array:', Array.isArray(response.data.availableTenants));
    console.log('✅ Quantidade de tenants:', response.data.availableTenants?.length || 0);
    
    if (response.data.availableTenants && response.data.availableTenants.length > 0) {
      console.log('\n📋 PRIMEIRO TENANT:');
      console.log(JSON.stringify(response.data.availableTenants[0], null, 2));
      
      const firstTenant = response.data.availableTenants[0];
      console.log('\n🔍 CAMPOS DO TENANT:');
      console.log('  - id:', firstTenant.id);
      console.log('  - name:', firstTenant.name);
      console.log('  - slug:', firstTenant.slug);
      console.log('  - institution_id:', firstTenant.institution_id || '❌ AUSENTE');
      console.log('  - role:', firstTenant.role);
    }

  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

testLoginResponse();
