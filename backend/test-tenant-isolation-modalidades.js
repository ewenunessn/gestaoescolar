/**
 * Script para testar isolamento de tenant nas modalidades
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testTenantIsolation() {
  try {
    console.log('🧪 Testando isolamento de tenant para modalidades...\n');

    // Primeiro, fazer login como admin para obter token
    console.log('1. Fazendo login como admin...');
    const loginResponse = await axios.post(`${API_BASE}/usuarios/login`, {
      email: 'admin@sistema.com',
      senha: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login realizado com sucesso\n');

    // Configurar headers com token
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Testar sem tenant (deve retornar erro ou dados vazios)
    console.log('2. Testando modalidades sem tenant...');
    try {
      const responseWithoutTenant = await axios.get(`${API_BASE}/modalidades`, { headers });
      console.log('❌ Sem tenant - Retornou:', responseWithoutTenant.data.total, 'modalidades');
    } catch (error) {
      console.log('✅ Sem tenant - Erro esperado:', error.response?.status, error.response?.data?.message);
    }

    // Testar com tenant específico
    console.log('\n3. Testando modalidades com tenant específico...');
    const tenantHeaders = {
      ...headers,
      'X-Tenant-ID': '1cc9b18f-2b7d-412d-bb6d-4b8055e9590f' // Tenant que tem modalidades
    };

    const responseWithTenant = await axios.get(`${API_BASE}/modalidades`, { headers: tenantHeaders });
    console.log('✅ Com tenant - Retornou:', responseWithTenant.data.total, 'modalidades');
    console.log('📋 Modalidades encontradas:');
    responseWithTenant.data.data.forEach(modalidade => {
      console.log(`   - ${modalidade.nome} (ID: ${modalidade.id})`);
    });

    // Testar com tenant diferente (deve retornar dados diferentes ou vazios)
    console.log('\n4. Testando modalidades com tenant diferente...');
    const differentTenantHeaders = {
      ...headers,
      'X-Tenant-ID': 'dfa764cb-9cfd-4ad6-a124-a493597ef343' // Tenant diferente
    };

    const responseWithDifferentTenant = await axios.get(`${API_BASE}/modalidades`, { headers: differentTenantHeaders });
    console.log('✅ Com tenant diferente - Retornou:', responseWithDifferentTenant.data.total, 'modalidades');
    
    if (responseWithDifferentTenant.data.total > 0) {
      console.log('📋 Modalidades encontradas:');
      responseWithDifferentTenant.data.data.forEach(modalidade => {
        console.log(`   - ${modalidade.nome} (ID: ${modalidade.id})`);
      });
    } else {
      console.log('📋 Nenhuma modalidade encontrada (isolamento funcionando!)');
    }

    console.log('\n🎉 Teste de isolamento de tenant concluído!');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testTenantIsolation();