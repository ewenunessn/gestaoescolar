const axios = require('axios');

async function testIntegracaoMobile() {
  const baseURL = 'http://localhost:3000/api';
  
  try {
    console.log('🧪 Testando integração mobile com configuração...\n');
    
    // 1. Criar uma configuração de teste
    console.log('1. Criando configuração de teste...');
    const configData = {
      guiaId: 1,
      rotasSelecionadas: [1, 2], // Apenas rotas 1 e 2
      itensSelecionados: [1, 2, 3], // Apenas itens 1, 2 e 3
      ativa: true
    };
    
    try {
      await axios.post(`${baseURL}/entregas/configuracao`, configData);
      console.log('✅ Configuração criada');
    } catch (error) {
      console.log('⚠️ Configuração já existe ou erro:', error.response?.data?.message);
    }
    
    // 2. Testar rotas filtradas
    console.log('\n2. Testando rotas filtradas...');
    try {
      const response = await axios.get(`${baseURL}/entregas/rotas-filtradas`);
      console.log('✅ Rotas filtradas:', response.data.length, 'rotas');
      console.log('IDs das rotas:', response.data.map(r => r.id));
    } catch (error) {
      console.log('❌ Erro ao buscar rotas filtradas:', error.response?.data);
    }
    
    // 3. Testar escolas filtradas
    console.log('\n3. Testando escolas filtradas...');
    try {
      const response = await axios.get(`${baseURL}/entregas/escolas-filtradas?rotaId=1`);
      console.log('✅ Escolas filtradas da rota 1:', response.data.length, 'escolas');
    } catch (error) {
      console.log('❌ Erro ao buscar escolas filtradas:', error.response?.data);
    }
    
    // 4. Testar itens filtrados
    console.log('\n4. Testando itens filtrados...');
    try {
      const response = await axios.get(`${baseURL}/entregas/escolas/1/itens-filtrados`);
      console.log('✅ Itens filtrados da escola 1:', response.data.length, 'itens');
      console.log('IDs dos itens:', response.data.map(i => i.id));
    } catch (error) {
      console.log('❌ Erro ao buscar itens filtrados:', error.response?.data);
    }
    
    // 5. Comparar com dados não filtrados
    console.log('\n5. Comparando com dados não filtrados...');
    try {
      const rotasNormais = await axios.get(`${baseURL}/entregas/rotas-entregas`);
      const escolasNormais = await axios.get(`${baseURL}/entregas/escolas?rotaId=1`);
      const itensNormais = await axios.get(`${baseURL}/entregas/escolas/1/itens`);
      
      console.log('📊 Comparação:');
      console.log(`   Rotas: ${response.data?.length || 0} filtradas vs ${rotasNormais.data?.length || 0} normais`);
      console.log(`   Escolas: dados filtrados vs ${escolasNormais.data?.length || 0} normais`);
      console.log(`   Itens: dados filtrados vs ${itensNormais.data?.length || 0} normais`);
    } catch (error) {
      console.log('⚠️ Erro na comparação:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testIntegracaoMobile();