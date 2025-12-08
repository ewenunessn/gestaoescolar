const axios = require('axios');

async function testVercelDirect() {
  console.log('🔍 Teste Direto do Vercel (sem autenticação)\n');
  
  const baseURL = 'https://gestaoescolar-backend-seven.vercel.app/api';
  
  // Teste 1: Health check
  console.log('1️⃣ Testando health check...');
  try {
    const response = await axios.get(`${baseURL}/health`);
    console.log('✅ Health check OK');
    console.log('   Versão:', response.data.version);
    console.log('   Database:', response.data.database?.connected ? 'Conectado' : 'Desconectado');
    console.log('   Ambiente:', response.data.environment?.nodeEnv);
  } catch (error) {
    console.log('❌ Health check falhou:', error.response?.status || error.message);
  }
  
  // Teste 2: Verificar se a rota de provisioning existe
  console.log('\n2️⃣ Testando rota de provisioning (sem token)...');
  try {
    const institutionId = 'c1c7aabd-7f03-43ab-8d6d-ff003ea9005f';
    const response = await axios.post(
      `${baseURL}/provisioning/institutions/${institutionId}/users`,
      {
        nome: 'Teste',
        email: 'teste@example.com',
        senha: 'senha123'
      },
      {
        validateStatus: () => true
      }
    );
    
    console.log('   Status:', response.status);
    console.log('   Mensagem:', response.data.message);
    
    if (response.status === 401) {
      console.log('✅ Rota existe e requer autenticação (esperado)');
    } else if (response.status === 404) {
      console.log('❌ Rota não encontrada!');
    } else {
      console.log('⚠️  Status inesperado:', response.status);
    }
  } catch (error) {
    console.log('❌ Erro:', error.message);
  }
  
  // Teste 3: Verificar instituição
  console.log('\n3️⃣ Testando acesso à instituição...');
  try {
    const institutionId = 'c1c7aabd-7f03-43ab-8d6d-ff003ea9005f';
    const response = await axios.get(
      `${baseURL}/institutions/${institutionId}`,
      {
        validateStatus: () => true
      }
    );
    
    console.log('   Status:', response.status);
    if (response.status === 200) {
      console.log('✅ Instituição acessível');
      console.log('   Nome:', response.data.name);
    } else if (response.status === 401) {
      console.log('⚠️  Requer autenticação');
    } else {
      console.log('❌ Status:', response.status);
    }
  } catch (error) {
    console.log('❌ Erro:', error.message);
  }
}

testVercelDirect();
