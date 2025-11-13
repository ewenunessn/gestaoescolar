const axios = require('axios');

const API_URL = 'https://gestaoescolar-backend-seven.vercel.app/api';

async function testDeleteTenant() {
  try {
    console.log('🔐 Fazendo login como admin...');
    
    const loginResponse = await axios.post(`${API_URL}/system-admin/auth/login`, {
      email: 'admin@sistema.com',
      password: 'Admin@123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login bem-sucedido');
    console.log('Token:', token.substring(0, 30) + '...');
    
    // Listar tenants
    console.log('\n📋 Listando tenants...');
    const tenantsResponse = await axios.get(`${API_URL}/system-admin/data/tenants`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const tenants = tenantsResponse.data.data;
    console.log(`Encontrados ${tenants.length} tenants:`);
    tenants.forEach(t => {
      console.log(`  - ${t.name} (${t.id}) - ${t.institution_name || 'Sem instituição'}`);
    });
    
    // Tentar deletar um tenant de teste (se existir)
    const testTenant = tenants.find(t => t.slug === 'escola-joao-silva' || t.slug === 'escola-padrao');
    
    if (testTenant) {
      console.log(`\n🗑️ Tentando deletar tenant: ${testTenant.name} (${testTenant.id})`);
      
      const deleteResponse = await axios.delete(
        `${API_URL}/system-admin/data/tenants/${testTenant.id}`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30000 // 30 segundos
        }
      );
      
      console.log('✅ Resposta do delete:', deleteResponse.data);
      
      // Verificar se foi deletado
      console.log('\n🔍 Verificando se foi deletado...');
      const verifyResponse = await axios.get(`${API_URL}/system-admin/data/tenants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const stillExists = verifyResponse.data.data.find(t => t.id === testTenant.id);
      if (stillExists) {
        console.log('❌ ERRO: Tenant ainda existe!');
      } else {
        console.log('✅ Tenant deletado com sucesso!');
      }
    } else {
      console.log('\n⚠️ Nenhum tenant de teste encontrado para deletar');
      console.log('Tenants disponíveis:', tenants.map(t => t.slug).join(', '));
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testDeleteTenant();
