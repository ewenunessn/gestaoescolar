const axios = require('axios');

async function testarAPIModalidades() {
  const baseURL = 'http://localhost:3000/api';
  
  console.log('🧪 Testando API de Modalidades\n');
  
  try {
    // Teste 1: Listar todas as modalidades
    console.log('1️⃣ GET /modalidades');
    const response1 = await axios.get(`${baseURL}/modalidades`);
    console.log('   Status:', response1.status);
    console.log('   Estrutura da resposta:', Object.keys(response1.data));
    console.log('   Dados:', JSON.stringify(response1.data, null, 2));
    console.log('   ✅ Sucesso\n');
    
    // Teste 2: Listar modalidades ativas
    console.log('2️⃣ GET /modalidades?ativo=true');
    const response2 = await axios.get(`${baseURL}/modalidades?ativo=true`);
    console.log('   Status:', response2.status);
    console.log('   Total de modalidades ativas:', response2.data.data?.length || response2.data.length);
    console.log('   ✅ Sucesso\n');
    
    // Teste 3: Listar todas (incluindo inativas)
    console.log('3️⃣ GET /modalidades (sem filtro)');
    const response3 = await axios.get(`${baseURL}/modalidades`);
    console.log('   Status:', response3.status);
    console.log('   Total de modalidades:', response3.data.data?.length || response3.data.length);
    
    if (response3.data.data) {
      console.log('\n   📋 Modalidades encontradas:');
      response3.data.data.forEach((m, i) => {
        console.log(`      ${i + 1}. ${m.nome} (ID: ${m.id}) - ${m.ativo ? '✅ Ativa' : '❌ Inativa'}`);
      });
    }
    console.log('   ✅ Sucesso\n');
    
  } catch (error) {
    console.error('❌ Erro ao testar API:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Dados:', error.response.data);
    }
  }
}

testarAPIModalidades();
