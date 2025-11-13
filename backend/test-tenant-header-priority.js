require('dotenv').config();
const axios = require('axios');

const API_URL = 'https://gestaoescolar-backend-seven.vercel.app';

async function testarPrioridadeHeader() {
  console.log('🧪 Testando prioridade do header X-Tenant-ID...\n');

  // Fazer login
  console.log('1️⃣ Fazendo login...');
  const login = await axios.post(`${API_URL}/api/auth/login`, {
    email: 'ewertonsolon@gmail.com',
    senha: '123456'
  });

  const token = login.data.token;
  const tenants = login.data.availableTenants;
  
  const tenantTesteFix = tenants.find(t => t.name.includes('Teste Fix')).id;
  const tenantEwerton = tenants.find(t => t.name.includes('Ewerton')).id;

  console.log(`✅ Login realizado`);
  console.log(`📌 Tenant Teste Fix: ${tenantTesteFix}`);
  console.log(`📌 Tenant Ewerton: ${tenantEwerton}\n`);

  // Teste 1: Enviar header X-Tenant-ID = Teste Fix
  console.log('2️⃣ Teste 1: Enviando X-Tenant-ID = Teste Fix');
  console.log(`   Header: X-Tenant-ID = ${tenantTesteFix}`);
  
  try {
    const response1 = await axios.get(`${API_URL}/api/escolas`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantTesteFix
      }
    });

    console.log(`   ✅ Resposta recebida:`);
    console.log(`      - Total de escolas: ${response1.data.total}`);
    console.log(`      - Tenant da resposta: ${response1.data.tenant}`);
    console.log(`      - TenantId da resposta: ${response1.data.tenantId}`);
    
    if (response1.data.data.length > 0) {
      console.log(`      - Escolas:`);
      response1.data.data.forEach(e => {
        console.log(`         * ${e.nome} (tenant_id: ${e.tenant_id.substring(0, 8)}...)`);
      });
    }
  } catch (error) {
    console.log(`   ❌ Erro:`, error.response?.data || error.message);
  }

  console.log();

  // Teste 2: Enviar header X-Tenant-ID = Ewerton
  console.log('3️⃣ Teste 2: Enviando X-Tenant-ID = Ewerton');
  console.log(`   Header: X-Tenant-ID = ${tenantEwerton}`);
  
  try {
    const response2 = await axios.get(`${API_URL}/api/escolas`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantEwerton
      }
    });

    console.log(`   ✅ Resposta recebida:`);
    console.log(`      - Total de escolas: ${response2.data.total}`);
    console.log(`      - Tenant da resposta: ${response2.data.tenant}`);
    console.log(`      - TenantId da resposta: ${response2.data.tenantId}`);
    
    if (response2.data.data.length > 0) {
      console.log(`      - Escolas:`);
      response2.data.data.forEach(e => {
        console.log(`         * ${e.nome} (tenant_id: ${e.tenant_id.substring(0, 8)}...)`);
      });
    }
  } catch (error) {
    console.log(`   ❌ Erro:`, error.response?.data || error.message);
  }

  console.log('\n🎯 CONCLUSÃO:');
  console.log('Se as escolas forem diferentes nos dois testes, o header está funcionando.');
  console.log('Se as escolas forem iguais, o header está sendo ignorado.');
}

testarPrioridadeHeader().catch(error => {
  console.error('❌ Erro:', error.response?.data || error.message);
});
