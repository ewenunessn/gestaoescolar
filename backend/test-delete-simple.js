const axios = require('axios');

const API_URL = 'https://gestaoescolar-backend-seven.vercel.app/api';

async function testDelete() {
  try {
    console.log('🔐 Login...');
    const loginResponse = await axios.post(`${API_URL}/system-admin/auth/login`, {
      email: 'admin@sistema.com',
      password: 'Admin@123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login OK\n');
    
    // Tentar deletar o tenant "Escola Padrão" que não tem dados
    const tenantId = '00000000-0000-0000-0000-000000000001';
    
    console.log(`🗑️ Deletando tenant ${tenantId}...`);
    console.log('Aguardando resposta (timeout 60s)...\n');
    
    const startTime = Date.now();
    
    const deleteResponse = await axios.delete(
      `${API_URL}/system-admin/data/tenants/${tenantId}`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        timeout: 60000
      }
    );
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✅ Sucesso em ${elapsed}s!`);
    console.log('Resposta:', deleteResponse.data);
    
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error('❌ Timeout - O servidor demorou mais de 60s para responder');
    } else {
      console.error('❌ Erro:', error.response?.data || error.message);
    }
  }
}

testDelete();
