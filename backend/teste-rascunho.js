const axios = require('axios');

async function testarRascunho() {
  try {
    console.log('🧪 Testando salvar como rascunho...');
    
    const pedido = {
      observacoes: "Pedido rascunho de teste",
      salvar_como_rascunho: true,  // ← RASCUNHO
      itens: [
        {
          contrato_produto_id: 19,
          quantidade: 5,
          data_entrega_prevista: "2025-01-25",
          observacoes: "Item rascunho"
        }
      ]
    };
    
    const response = await axios.post('http://localhost:3000/api/pedidos', pedido, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Rascunho salvo com sucesso!');
    console.log('📋 Status:', response.data.data.status);
    console.log('📋 Número:', response.data.data.numero);
    console.log('📋 Mensagem:', response.data.message);
    
  } catch (error) {
    console.error('❌ Erro ao salvar rascunho:', error.response?.data || error.message);
  }
}

testarRascunho();