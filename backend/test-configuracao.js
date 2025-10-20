const axios = require('axios');

async function testConfiguracao() {
  const baseURL = 'http://localhost:3000/api';
  
  try {
    console.log('🧪 Testando rotas de configuração...\n');
    
    // 1. Testar buscar configuração ativa (deve retornar 404 inicialmente)
    console.log('1. Testando buscar configuração ativa...');
    try {
      const response1 = await axios.get(`${baseURL}/entregas/configuracao-ativa`);
      console.log('✅ Configuração ativa encontrada:', response1.data);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Nenhuma configuração ativa (esperado)');
      } else {
        console.log('❌ Erro inesperado:', error.response?.status, error.response?.data);
      }
    }
    
    // 2. Testar salvar nova configuração
    console.log('\n2. Testando salvar configuração...');
    try {
      const configData = {
        guiaId: 1,
        rotasSelecionadas: [1, 2],
        itensSelecionados: [1, 2, 3, 4],
        ativa: true
      };
      
      const response2 = await axios.post(`${baseURL}/entregas/configuracao`, configData);
      console.log('✅ Configuração salva:', response2.data);
      
      // 3. Testar buscar configuração ativa novamente
      console.log('\n3. Testando buscar configuração ativa após salvar...');
      const response3 = await axios.get(`${baseURL}/entregas/configuracao-ativa`);
      console.log('✅ Configuração ativa encontrada:', response3.data);
      
    } catch (error) {
      console.log('❌ Erro ao salvar configuração:', error.response?.status, error.response?.data);
    }
    
    // 4. Testar listar todas as configurações
    console.log('\n4. Testando listar configurações...');
    try {
      const response4 = await axios.get(`${baseURL}/entregas/configuracoes`);
      console.log('✅ Configurações listadas:', response4.data);
    } catch (error) {
      console.log('❌ Erro ao listar configurações:', error.response?.status, error.response?.data);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testConfiguracao();