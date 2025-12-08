const axios = require('axios');

async function testVercelAPI() {
  console.log('🔍 Testando API do Vercel para identificar erro 500...\n');
  
  const baseURL = 'https://gestaoescolar-backend-seven.vercel.app/api';
  const institutionId = 'c1c7aabd-7f03-43ab-8d6d-ff003ea9005f';
  
  // Token do console (substitua pelo token real)
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OSwiZW1haWwiOiJld2VydG9uc29sb25AZ21haWwuY29tLmJyIiwicm9sZSI6InN1cGVyX2FkbWluIiwidHlwZSI6InN5c3RlbV9hZG1pbiIsInBlcm1pc3Npb25zIjp7fSwiaWF0IjoxNzMzMTU0MzUyLCJleHAiOjE3MzMyNDA3NTJ9.dummy';
  
  const userData = {
    nome: 'Teste Debug',
    email: `teste-debug-${Date.now()}@example.com`,
    senha: 'senha123',
    tipo: 'usuario',
    institution_role: 'user'
  };
  
  try {
    console.log('📤 Tentando criar usuário...');
    console.log('   URL:', `${baseURL}/provisioning/institutions/${institutionId}/users`);
    console.log('   Dados:', { ...userData, senha: '***' });
    
    const response = await axios.post(
      `${baseURL}/provisioning/institutions/${institutionId}/users`,
      userData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        validateStatus: () => true // Aceitar qualquer status
      }
    );
    
    console.log('\n📊 Resposta do servidor:');
    console.log('   Status:', response.status);
    console.log('   Headers:', JSON.stringify(response.headers, null, 2));
    console.log('   Body:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 500) {
      console.log('\n❌ ERRO 500 DETECTADO!');
      console.log('   Mensagem:', response.data.message);
      console.log('   Erro:', response.data.error);
      if (response.data.details) {
        console.log('   Detalhes:', response.data.details);
      }
    }
    
  } catch (error) {
    console.error('\n❌ ERRO NA REQUISIÇÃO:');
    console.error('   Mensagem:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

console.log('⚠️  IMPORTANTE: Substitua o token pela versão real do localStorage!');
console.log('   Execute no console do navegador: localStorage.getItem("adminToken")\n');

testVercelAPI();
