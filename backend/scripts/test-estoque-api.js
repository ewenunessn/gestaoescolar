const axios = require('axios');

async function testEstoqueAPI() {
  try {
    console.log('Testando API de estoque central...\n');
    
    const response = await axios.get('http://localhost:3000/api/estoque-central', {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token if needed
      }
    });
    
    console.log('Status:', response.status);
    console.log('Total de itens:', response.data.estoque?.length || 0);
    
    if (response.data.estoque && response.data.estoque.length > 0) {
      const item = response.data.estoque[0];
      console.log('\nPrimeiro item:');
      console.log('- produto_nome:', item.produto_nome);
      console.log('- quantidade:', item.quantidade, '(tipo:', typeof item.quantidade, ')');
      console.log('- quantidade_disponivel:', item.quantidade_disponivel, '(tipo:', typeof item.quantidade_disponivel, ')');
      console.log('- total_lotes:', item.total_lotes, '(tipo:', typeof item.total_lotes, ')');
      
      console.log('\nJSON completo do primeiro item:');
      console.log(JSON.stringify(item, null, 2));
    } else {
      console.log('\nNenhum item no estoque');
    }
    
  } catch (error) {
    if (error.response) {
      console.error('Erro na resposta:', error.response.status, error.response.data);
    } else {
      console.error('Erro:', error.message);
    }
  }
}

testEstoqueAPI();
