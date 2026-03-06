const axios = require('axios');

const API_URL = 'https://gestaoescolar-backend.vercel.app/api';

async function testarAPI() {
  console.log('🧪 Testando API de produtos de refeição no Vercel...\n');

  try {
    // 1. Listar refeições
    console.log('1️⃣ GET /refeicoes');
    const refRes = await axios.get(`${API_URL}/refeicoes`);
    console.log('Status:', refRes.status);
    console.log('Tipo de resposta:', typeof refRes.data);
    console.log('É array?', Array.isArray(refRes.data));
    
    const refeicoes = refRes.data.data || refRes.data || [];
    console.log('Refeições encontradas:', refeicoes.length);
    
    if (refeicoes.length > 0) {
      const refeicao = refeicoes[0];
      console.log('Primeira refeição:', { id: refeicao.id, nome: refeicao.nome });
      
      // 2. Listar produtos da refeição
      console.log(`\n2️⃣ GET /refeicoes/${refeicao.id}/produtos`);
      try {
        const prodRes = await axios.get(`${API_URL}/refeicoes/${refeicao.id}/produtos`);
        console.log('✅ Status:', prodRes.status);
        console.log('Resposta completa:', JSON.stringify(prodRes.data, null, 2));
        
        const produtos = prodRes.data.data || prodRes.data || [];
        console.log('Produtos encontrados:', produtos.length);
        
        if (produtos.length > 0) {
          console.log('Primeiro produto:', produtos[0]);
        }
      } catch (error) {
        console.error('❌ Erro ao listar produtos:');
        console.error('Status:', error.response?.status);
        console.error('Data:', error.response?.data);
        console.error('Message:', error.message);
      }
      
      // 3. Listar todos os produtos disponíveis
      console.log('\n3️⃣ GET /produtos');
      const todosProdRes = await axios.get(`${API_URL}/produtos`);
      const todosProdutos = todosProdRes.data.data || todosProdRes.data || [];
      console.log('Produtos disponíveis:', todosProdutos.length);
      
      if (todosProdutos.length > 0) {
        const produto = todosProdutos[0];
        console.log('Primeiro produto:', { id: produto.id, nome: produto.nome });
        
        // 4. Tentar adicionar produto
        console.log(`\n4️⃣ POST /refeicoes/${refeicao.id}/produtos`);
        console.log('Payload:', {
          produto_id: produto.id,
          per_capita: 100,
          tipo_medida: 'gramas'
        });
        
        try {
          const addRes = await axios.post(`${API_URL}/refeicoes/${refeicao.id}/produtos`, {
            produto_id: produto.id,
            per_capita: 100,
            tipo_medida: 'gramas'
          });
          console.log('✅ Status:', addRes.status);
          console.log('Resposta:', JSON.stringify(addRes.data, null, 2));
          
          // 5. Listar novamente para verificar
          console.log(`\n5️⃣ GET /refeicoes/${refeicao.id}/produtos (após adicionar)`);
          const prodRes2 = await axios.get(`${API_URL}/refeicoes/${refeicao.id}/produtos`);
          const produtos2 = prodRes2.data.data || prodRes2.data || [];
          console.log('Produtos após adicionar:', produtos2.length);
          console.log('Produtos:', JSON.stringify(produtos2, null, 2));
          
        } catch (error) {
          console.error('❌ Erro ao adicionar produto:');
          console.error('Status:', error.response?.status);
          console.error('Data:', JSON.stringify(error.response?.data, null, 2));
          console.error('Message:', error.message);
        }
      }
    } else {
      console.log('⚠️ Nenhuma refeição encontrada');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testarAPI();
