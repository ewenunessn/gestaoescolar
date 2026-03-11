const axios = require('axios');

// URLs para teste
const LOCAL_URL = 'http://localhost:3000';
const PRODUCTION_URL = 'https://gestaoescolar-backend.vercel.app';

async function testInstituicaoAPI(baseUrl, environment) {
  console.log(`\n🧪 Testando API da Instituição - ${environment}`);
  console.log(`🔗 URL: ${baseUrl}`);
  
  try {
    // Teste 1: Health check
    console.log('1️⃣ Testando health check...');
    const healthResponse = await axios.get(`${baseUrl}/health`);
    console.log(`✅ Health check OK - Status: ${healthResponse.status}`);
    
    // Teste 2: Buscar instituição (sem auth para teste)
    console.log('2️⃣ Testando busca da instituição...');
    try {
      const instituicaoResponse = await axios.get(`${baseUrl}/api/instituicao`);
      console.log(`✅ Busca da instituição OK - Status: ${instituicaoResponse.status}`);
      console.log(`📋 Nome: ${instituicaoResponse.data.nome}`);
      console.log(`🏢 ID: ${instituicaoResponse.data.id}`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('⚠️ Busca da instituição requer autenticação (esperado)');
      } else {
        console.log(`❌ Erro na busca: ${error.message}`);
      }
    }
    
    // Teste 3: Verificar se a rota existe
    console.log('3️⃣ Testando se a rota existe...');
    try {
      await axios.get(`${baseUrl}/api/instituicao`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Rota existe (retornou 401 - não autorizado)');
      } else if (error.response?.status === 404) {
        console.log('❌ Rota não encontrada (404)');
      } else {
        console.log(`⚠️ Erro inesperado: ${error.response?.status} - ${error.message}`);
      }
    }
    
    console.log(`✅ Testes do ${environment} concluídos`);
    
  } catch (error) {
    console.log(`❌ Erro geral nos testes do ${environment}:`, error.message);
  }
}

async function main() {
  console.log('🚀 Iniciando testes da API da Instituição...');
  
  // Testar ambiente local (se disponível)
  try {
    await testInstituicaoAPI(LOCAL_URL, 'LOCAL');
  } catch (error) {
    console.log('⚠️ Ambiente local não disponível');
  }
  
  // Testar ambiente de produção
  try {
    await testInstituicaoAPI(PRODUCTION_URL, 'PRODUÇÃO (Vercel/Neon)');
  } catch (error) {
    console.log('❌ Erro ao testar produção:', error.message);
  }
  
  console.log('\n🎉 Testes concluídos!');
}

main();