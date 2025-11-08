const axios = require('axios');

const API_URL = 'https://gestaoescolar-backend.vercel.app';

async function testarSwitch() {
  console.log('🧪 Testando switch de tenant...\n');

  try {
    // 1. Fazer login
    console.log('1️⃣ Fazendo login...');
    const loginResponse = await axios.post(`${API_URL}/api/usuarios/login`, {
      email: 'ewenunes0@gmail.com',
      senha: '@Nunes8922'
    });

    const { token, availableTenants } = loginResponse.data;
    console.log('✅ Login realizado');
    console.log(`   Tenants disponíveis: ${availableTenants.length}`);
    availableTenants.forEach(t => {
      console.log(`   - ${t.name} (${t.id})`);
    });
    console.log('');

    // 2. Testar switch para cada tenant
    console.log('2️⃣ Testando switch de tenant...');
    
    for (const tenant of availableTenants) {
      console.log(`\n   Tentando mudar para: ${tenant.name}`);
      
      try {
        const response = await axios.post(
          `${API_URL}/api/tenants/switch`,
          { tenantId: tenant.id },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`   ✅ Sucesso!`);
        console.log(`   Resposta completa:`, JSON.stringify(response.data, null, 2));
        
      } catch (error) {
        if (error.response) {
          console.log(`   ❌ Erro ${error.response.status}: ${error.response.data.message || error.response.data.error}`);
          console.log(`   Detalhes:`, error.response.data);
        } else {
          console.log(`   ❌ Erro: ${error.message}`);
        }
      }
    }
    
    console.log('\n✅ Teste concluído!');

  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data || error.message);
  }
}

testarSwitch();
