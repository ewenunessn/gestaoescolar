const axios = require('axios');

const API_URL = 'https://gestaoescolar-backend.vercel.app';

async function testarEscolas() {
  console.log('🧪 Testando escolas por tenant...\n');

  try {
    // 1. Fazer login
    console.log('1️⃣ Fazendo login...');
    const loginResponse = await axios.post(`${API_URL}/api/usuarios/login`, {
      email: 'ewenunes0@gmail.com',
      senha: '@Nunes8922'
    });

    const { token, availableTenants } = loginResponse.data;
    console.log('✅ Login realizado\n');

    // 2. Testar escolas para cada tenant
    for (const tenant of availableTenants) {
      console.log(`📋 Testando tenant: ${tenant.name}`);
      
      try {
        const response = await axios.get(`${API_URL}/api/escolas`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-ID': tenant.id
          }
        });
        
        const escolas = response.data.data || [];
        console.log(`   ✅ ${escolas.length} escolas encontradas`);
        
        if (escolas.length > 0) {
          console.log(`   Primeiras 3 escolas:`);
          escolas.slice(0, 3).forEach(e => {
            console.log(`      - ${e.nome}`);
          });
        }
        
      } catch (error) {
        console.log(`   ❌ Erro: ${error.response?.data?.message || error.message}`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

testarEscolas();
