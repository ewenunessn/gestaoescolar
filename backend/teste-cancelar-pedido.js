const axios = require('axios');

async function testarCancelamento() {
  try {
    console.log('🧪 Testando cancelamento de pedido...');
    
    // Primeiro, criar um pedido para cancelar
    const novoPedido = {
      observacoes: "Pedido para teste de cancelamento",
      salvar_como_rascunho: false, // Criar como pendente
      itens: [
        {
          contrato_produto_id: 19,
          quantidade: 5,
          data_entrega_prevista: "2025-01-25",
          observacoes: "Item para cancelar"
        }
      ]
    };
    
    console.log('🔄 Criando pedido...');
    const createResponse = await axios.post('http://localhost:3000/api/pedidos', novoPedido);
    const pedidoId = createResponse.data.data.id;
    console.log(`✅ Pedido criado com ID: ${pedidoId}, Status: ${createResponse.data.data.status}`);
    
    // Agora cancelar o pedido
    console.log('🔄 Cancelando pedido...');
    const cancelResponse = await axios.post(`http://localhost:3000/api/pedidos/${pedidoId}/cancelar`, {
      motivo: "Teste de cancelamento via API"
    });
    
    console.log('✅ Resposta do cancelamento:', {
      success: cancelResponse.data.success,
      message: cancelResponse.data.message,
      status: cancelResponse.data.data.status,
      observacoes: cancelResponse.data.data.observacoes
    });
    
    // Verificar se o pedido foi realmente cancelado
    const pedidoCancelado = await axios.get(`http://localhost:3000/api/pedidos/${pedidoId}`);
    console.log('📋 Pedido após cancelamento:', {
      id: pedidoCancelado.data.data.id,
      status: pedidoCancelado.data.data.status,
      observacoes: pedidoCancelado.data.data.observacoes
    });
    
    console.log('\n✅ Teste de cancelamento concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data || error.message);
  }
}

testarCancelamento();