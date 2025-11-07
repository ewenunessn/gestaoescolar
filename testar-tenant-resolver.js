/**
 * Script para testar a resolução de tenant após correção
 */

const axios = require('axios');

const API_URL = 'https://gestaoescolar-backend.vercel.app';

async function testarResolucaoTenant() {
  console.log('🧪 Testando resolução de tenant após correção\n');

  try {
    // 1. Fazer login
    console.log('1️⃣ Fazendo login...');
    const loginResponse = await axios.post(`${API_URL}/api/usuarios/login`, {
      email: 'admin@sistema.com',
      senha: 'admin123'
    });

    const { token, tenant, availableTenants } = loginResponse.data;
    console.log('✅ Login realizado');
    console.log('   Token:', token.substring(0, 30) + '...');
    console.log('   Tenant principal:', tenant);
    console.log('   Tenants disponíveis:', availableTenants.length);
    console.log('');

    // 2. Testar com header X-Tenant-ID
    console.log('2️⃣ Testando com header X-Tenant-ID...');
    for (const t of availableTenants) {
      console.log(`   Testando tenant: ${t.name} (${t.id})`);
      
      try {
        const response = await axios.get(`${API_URL}/api/escolas`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-ID': t.id
          }
        });
        
        console.log(`   ✅ Sucesso! Escolas encontradas: ${response.data.data?.length || 0}`);
      } catch (error) {
        if (error.response) {
          console.log(`   ❌ Erro: ${error.response.data.error} - ${error.response.data.message}`);
        } else {
          console.log(`   ❌ Erro: ${error.message}`);
        }
      }
    }
    console.log('');

    // 3. Testar sem header (apenas token)
    console.log('3️⃣ Testando sem header (apenas token)...');
    try {
      const response = await axios.get(`${API_URL}/api/escolas`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`   ✅ Sucesso! Escolas encontradas: ${response.data.data?.length || 0}`);
    } catch (error) {
      if (error.response) {
        console.log(`   ❌ Erro: ${error.response.data.error} - ${error.response.data.message}`);
      } else {
        console.log(`   ❌ Erro: ${error.message}`);
      }
    }
    console.log('');

    console.log('✅ Teste concluído!');

  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data || error.message);
  }
}

testarResolucaoTenant();
