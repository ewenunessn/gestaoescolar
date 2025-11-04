/**
 * Script para testar isolamento de tenant em todos os módulos implementados
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testAllTenantIsolation() {
  try {
    console.log('🧪 Testando isolamento de tenant em todos os módulos...\n');

    // Fazer login como admin
    console.log('1. Fazendo login como admin...');
    const loginResponse = await axios.post(`${API_BASE}/usuarios/login`, {
      email: 'admin@sistema.com',
      senha: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login realizado com sucesso\n');

    // Configurar headers
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Tenants para teste
    const tenant1 = '1cc9b18f-2b7d-412d-bb6d-4b8055e9590f'; // Tenant com dados
    const tenant2 = 'dfa764cb-9cfd-4ad6-a124-a493597ef343'; // Tenant diferente

    // Módulos para testar
    const modules = [
      { name: 'Modalidades', endpoint: '/modalidades' },
      { name: 'Refeições', endpoint: '/refeicoes' },
      { name: 'Fornecedores', endpoint: '/fornecedores' },
      { name: 'Contratos', endpoint: '/contratos' },
      { name: 'Cardápios', endpoint: '/cardapios' },
      { name: 'Escolas', endpoint: '/escolas' },
      { name: 'Produtos', endpoint: '/produtos' }
    ];

    for (const module of modules) {
      console.log(`\n📋 Testando ${module.name}...`);
      
      try {
        // Testar com tenant 1
        const tenant1Headers = { ...headers, 'X-Tenant-ID': tenant1 };
        const response1 = await axios.get(`${API_BASE}${module.endpoint}`, { headers: tenant1Headers });
        const count1 = response1.data.total || response1.data.data?.length || 0;
        
        // Testar com tenant 2
        const tenant2Headers = { ...headers, 'X-Tenant-ID': tenant2 };
        const response2 = await axios.get(`${API_BASE}${module.endpoint}`, { headers: tenant2Headers });
        const count2 = response2.data.total || response2.data.data?.length || 0;
        
        console.log(`   Tenant 1: ${count1} registros`);
        console.log(`   Tenant 2: ${count2} registros`);
        
        if (count1 !== count2) {
          console.log(`   ✅ Isolamento funcionando - dados diferentes entre tenants`);
        } else if (count1 === 0 && count2 === 0) {
          console.log(`   ⚠️  Ambos tenants sem dados - não é possível verificar isolamento`);
        } else {
          console.log(`   ❓ Mesma quantidade de dados - verificar se é esperado`);
        }
        
      } catch (error) {
        if (error.response?.status === 500) {
          console.log(`   ❌ Erro 500 - possivelmente sem isolamento implementado`);
        } else {
          console.log(`   ❌ Erro: ${error.response?.status} - ${error.response?.data?.message}`);
        }
      }
    }

    console.log('\n🎉 Teste completo de isolamento de tenant concluído!');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testAllTenantIsolation();