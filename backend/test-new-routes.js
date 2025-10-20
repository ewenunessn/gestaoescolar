const axios = require('axios');

async function testNewRoutes() {
  const baseURL = 'https://gestaoescolar-backend.vercel.app/api';
  
  try {
    console.log('🧪 Testando novas rotas...');
    
    // Testar rota de itens da guia
    console.log('\n1. Testando /guias/1/itens');
    try {
      const response1 = await axios.get(`${baseURL}/guias/1/itens`);
      console.log('✅ Rota /guias/1/itens funcionando:', response1.status);
      console.log('Dados:', response1.data);
    } catch (error) {
      console.log('❌ Erro na rota /guias/1/itens:', error.response?.status, error.response?.data);
    }
    
    // Testar rota de planejamento avançado
    console.log('\n2. Testando /entregas/planejamentos-avancado');
    try {
      const testData = {
        guiaId: 1,
        rotaIds: [1, 2],
        dataPlanejada: '2025-01-15',
        responsavel: 'João Silva',
        observacao: 'Teste de planejamento avançado',
        itensSelecionados: [1, 2, 3]
      };
      
      const response2 = await axios.post(`${baseURL}/entregas/planejamentos-avancado`, testData);
      console.log('✅ Rota /entregas/planejamentos-avancado funcionando:', response2.status);
      console.log('Dados:', response2.data);
    } catch (error) {
      console.log('❌ Erro na rota /entregas/planejamentos-avancado:', error.response?.status, error.response?.data);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testNewRoutes();