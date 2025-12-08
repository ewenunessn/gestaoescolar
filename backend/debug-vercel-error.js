const axios = require('axios');

async function debugVercelError() {
  console.log('🔍 Debugando erro 500 no Vercel...\n');
  
  const institutionId = 'c1c7aabd-7f03-43ab-8d6d-ff003ea9005f';
  
  // Teste 1: Verificar se a rota existe
  console.log('1️⃣ Testando se a rota existe...');
  try {
    const response = await axios.get(
      `https://gestaoescolar-backend-seven.vercel.app/api/provisioning/institutions/${institutionId}/hierarchy`,
      {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OSwiZW1haWwiOiJld2VydG9uc29sb25AZ21haWwuY29tLmJyIiwicm9sZSI6InN1cGVyX2FkbWluIiwidHlwZSI6InN5c3RlbV9hZG1pbiIsInBlcm1pc3Npb25zIjp7fSwiaWF0IjoxNzMzMTU0MzUyLCJleHAiOjE3MzMyNDA3NTJ9.dummy'
        }
      }
    );
    console.log('✅ Rota hierarchy funciona:', response.status);
  } catch (error) {
    console.log('❌ Erro na rota hierarchy:', error.response?.status, error.response?.data);
  }
  
  // Teste 2: Verificar conexão com banco
  console.log('\n2️⃣ Testando conexão com banco...');
  try {
    const response = await axios.get(
      'https://gestaoescolar-backend-seven.vercel.app/api/health'
    );
    console.log('✅ Health check:', response.data);
  } catch (error) {
    console.log('❌ Health check falhou:', error.message);
  }
}

debugVercelError();
