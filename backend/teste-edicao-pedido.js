const axios = require('axios');

async function testarEdicaoPedido() {
  try {
    console.log('🧪 Testando edição de pedido...');
    
    // Primeiro, vamos buscar um pedido rascunho
    const listResponse = await axios.get('http://localhost:3000/api/pedidos?status=rascunho');
    const pedidos = listResponse.data.data;
    
    if (pedidos.length === 0) {
      console.log('❌ Nenhum pedido rascunho encontrado. Criando um...');
      
      // Criar um rascunho primeiro
      const novoPedido = {
        observacoes: "Pedido para teste de edição",
        salvar_como_rascunho: true,
        itens: [
          {
            contrato_produto_id: 19,
            quantidade: 5,
            data_entrega_prevista: "2025-01-25",
            observacoes: "Item original"
          }
        ]
      };
      
      const createResponse = await axios.post('http://localhost:3000/api/pedidos', novoPedido);
      const pedidoId = createResponse.data.data.id;
      console.log(`✅ Rascunho criado com ID: ${pedidoId}`);
      
      // Agora testar a edição
      await testarEdicao(pedidoId);
    } else {
      const pedidoId = pedidos[0].id;
      console.log(`✅ Usando pedido rascunho existente: ${pedidoId}`);
      await testarEdicao(pedidoId);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data || error.message);
  }
}

async function testarEdicao(pedidoId) {
  try {
    console.log(`\n🔄 Testando edição do pedido ${pedidoId}...`);
    
    // Buscar pedido atual
    const pedidoAtual = await axios.get(`http://localhost:3000/api/pedidos/${pedidoId}`);
    console.log('📋 Pedido atual:', {
      id: pedidoAtual.data.data.id,
      status: pedidoAtual.data.data.status,
      valor_total: pedidoAtual.data.data.valor_total,
      total_itens: pedidoAtual.data.data.itens.length
    });
    
    // Editar itens do pedido
    const novosItens = [
      {
        contrato_produto_id: 19,
        quantidade: 10, // Mudou de 5 para 10
        data_entrega_prevista: "2025-01-30", // Mudou a data
        observacoes: "Item editado - quantidade dobrada"
      }
    ];
    
    console.log('🔄 Atualizando itens...');
    await axios.put(`http://localhost:3000/api/pedidos/${pedidoId}/itens`, {
      itens: novosItens
    });
    
    // Atualizar observações gerais
    console.log('🔄 Atualizando observações...');
    await axios.put(`http://localhost:3000/api/pedidos/${pedidoId}`, {
      observacoes: "Pedido editado via teste - observações atualizadas"
    });
    
    // Verificar se as mudanças foram aplicadas
    const pedidoEditado = await axios.get(`http://localhost:3000/api/pedidos/${pedidoId}`);
    console.log('✅ Pedido após edição:', {
      id: pedidoEditado.data.data.id,
      status: pedidoEditado.data.data.status,
      valor_total: pedidoEditado.data.data.valor_total,
      observacoes: pedidoEditado.data.data.observacoes,
      total_itens: pedidoEditado.data.data.itens.length,
      primeiro_item: {
        quantidade: pedidoEditado.data.data.itens[0]?.quantidade,
        data_entrega: pedidoEditado.data.data.itens[0]?.data_entrega_prevista,
        observacoes: pedidoEditado.data.data.itens[0]?.observacoes
      }
    });
    
    console.log('\n✅ Teste de edição concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na edição:', error.response?.data || error.message);
  }
}

testarEdicaoPedido();