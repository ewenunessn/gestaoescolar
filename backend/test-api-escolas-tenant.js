require('dotenv').config();
const axios = require('axios');

const API_URL = 'https://gestaoescolar-backend-seven.vercel.app';

async function testarListagemEscolas() {
  console.log('🧪 Testando listagem de escolas com diferentes tenants...\n');

  // Fazer login
  console.log('1️⃣ Fazendo login...');
  const login = await axios.post(`${API_URL}/api/auth/login`, {
    email: 'ewertonsolon@gmail.com',
    senha: '123456'
  });

  const token = login.data.token;
  const tenants = login.data.availableTenants;
  
  console.log(`✅ Token: ${token.substring(0, 20)}...`);
  console.log(`✅ Tenants disponíveis: ${tenants.length}`);
  tenants.forEach((t, i) => {
    console.log(`   ${i + 1}. ${t.name} (${t.id.substring(0, 8)}...)`);
  });
  console.log();

  // Identificar os tenants
  const tenantTesteFix = tenants.find(t => t.name.includes('Teste Fix'))?.id;
  const tenantEwerton = tenants.find(t => t.name.includes('Ewerton'))?.id;

  if (!tenantTesteFix || !tenantEwerton) {
    console.log('❌ Não encontrei os dois tenants esperados!');
    console.log('Tenants encontrados:', tenants.map(t => t.name));
    return;
  }

  console.log(`📌 Tenant Teste Fix: ${tenantTesteFix}`);
  console.log(`📌 Tenant Ewerton: ${tenantEwerton}\n`);

  const tokenTesteFix = token;
  const tokenEwerton = token;

  // Listar escolas do Teste Fix
  console.log('3️⃣ Listando escolas do Teste Fix...');
  const escolasTesteFix = await axios.get(`${API_URL}/api/escolas`, {
    headers: {
      'Authorization': `Bearer ${tokenTesteFix}`,
      'X-Tenant-ID': tenantTesteFix
    }
  });

  console.log(`📊 Escolas do Teste Fix (${escolasTesteFix.data.total}):`);
  escolasTesteFix.data.data.forEach(escola => {
    console.log(`   - ${escola.nome} (ID: ${escola.id}, Tenant: ${escola.tenant_id.substring(0, 8)}...)`);
  });
  console.log();

  // Listar escolas do Ewerton
  console.log('4️⃣ Listando escolas do Ewerton...');
  const escolasEwerton = await axios.get(`${API_URL}/api/escolas`, {
    headers: {
      'Authorization': `Bearer ${tokenEwerton}`,
      'X-Tenant-ID': tenantEwerton
    }
  });

  console.log(`📊 Escolas do Ewerton (${escolasEwerton.data.total}):`);
  escolasEwerton.data.data.forEach(escola => {
    console.log(`   - ${escola.nome} (ID: ${escola.id}, Tenant: ${escola.tenant_id.substring(0, 8)}...)`);
  });
  console.log();

  // Verificar se há escolas duplicadas
  const escolasTesteFix_nomes = escolasTesteFix.data.data.map(e => e.nome);
  const escolasEwerton_nomes = escolasEwerton.data.data.map(e => e.nome);
  const duplicadas = escolasTesteFix_nomes.filter(nome => escolasEwerton_nomes.includes(nome));

  if (duplicadas.length > 0) {
    console.log('❌ PROBLEMA ENCONTRADO! Escolas duplicadas entre tenants:');
    duplicadas.forEach(nome => console.log(`   - ${nome}`));
  } else {
    console.log('✅ Nenhuma escola duplicada entre tenants!');
  }
}

testarListagemEscolas().catch(error => {
  console.error('❌ Erro:', error.response?.data || error.message);
});
