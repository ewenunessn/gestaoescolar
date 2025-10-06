const axios = require('axios');

async function testarCriarPedido() {
  try {
    console.log('🧪 Testando criação de pedido...');
    
    const pedido = {
      observacoes: "Pedido de teste",
      salvar_como_rascunho: false,
      itens: [
        {
          contrato_produto_id: 19,
          quantidade: 10,
          data_entrega_prevista: "2025-01-20",
          observacoes: "Item de teste"
        }
      ]
    };
    
    const response = await axios.post('http://localhost:3000/api/pedidos', pedido, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Pedido criado com sucesso!');
    console.log('📋 Dados do pedido:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Erro ao criar pedido:', error.response?.data || error.message);
  }
}

testarCriarPedido();