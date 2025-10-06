const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Configurar token de autenticação (substitua pelo seu token)
const TOKEN = 'seu_token_aqui';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testarExclusaoQualquerFase() {
  console.log('🧪 Testando exclusão de pedidos em qualquer fase...\n');

  try {
    // 1. Listar pedidos existentes
    console.log('1. Listando pedidos existentes...');
    const listResponse = await api.get('/pedidos');
    const pedidos = listResponse.data.data || [];
    
    if (pedidos.length === 0) {
      console.log('❌ Nenhum pedido encontrado para testar');
      return;
    }

    console.log(`✅ Encontrados ${pedidos.length} pedidos`);
    
    // Mostrar pedidos por status
    const pedidosPorStatus = {};
    pedidos.forEach(pedido => {
      if (!pedidosPorStatus[pedido.status]) {
        pedidosPorStatus[pedido.status] = [];
      }
      pedidosPorStatus[pedido.status].push(pedido);
    });

    console.log('\n📊 Pedidos por status:');
    Object.keys(pedidosPorStatus).forEach(status => {
      console.log(`  ${status}: ${pedidosPorStatus[status].length} pedidos`);
      pedidosPorStatus[status].forEach(pedido => {
        console.log(`    - ${pedido.numero} (ID: ${pedido.id})`);
      });
    });

    // 2. Testar exclusão de um pedido de cada status (se disponível)
    console.log('\n2. Testando exclusão por status...');
    
    for (const status of Object.keys(pedidosPorStatus)) {
      const pedidosDoStatus = pedidosPorStatus[status];
      if (pedidosDoStatus.length > 0) {
        const pedido = pedidosDoStatus[0];
        
        console.log(`\n🔄 Testando exclusão do pedido ${pedido.numero} (Status: ${status})`);
        
        try {
          const response = await api.delete(`/pedidos/${pedido.id}`);
          console.log(`✅ Pedido ${pedido.numero} excluído com sucesso!`);
          console.log(`   Mensagem: ${response.data.message}`);
        } catch (error) {
          if (error.response) {
            console.log(`❌ Erro ao excluir pedido ${pedido.numero}:`);
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Mensagem: ${error.response.data.message}`);
          } else {
            console.log(`❌ Erro de rede: ${error.message}`);
          }
        }
        
        // Aguardar um pouco entre as exclusões
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 3. Verificar lista final
    console.log('\n3. Verificando lista final de pedidos...');
    const finalResponse = await api.get('/pedidos');
    const pedidosFinais = finalResponse.data.data || [];
    console.log(`📊 Pedidos restantes: ${pedidosFinais.length}`);

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Dados:', error.response.data);
    }
  }
}

// Função para criar pedidos de teste em diferentes status
async function criarPedidosTeste() {
  console.log('🔧 Criando pedidos de teste em diferentes status...\n');

  try {
    // Criar um rascunho
    console.log('1. Criando rascunho...');
    const rascunhoResponse = await api.post('/pedidos', {
      contrato_id: 1,
      escola_id: 1,
      salvar_como_rascunho: true,
      observacoes: 'Pedido de teste - Rascunho',
      itens: [
        {
          contrato_produto_id: 1,
          quantidade: 10
        }
      ]
    });
    console.log(`✅ Rascunho criado: ${rascunhoResponse.data.data.numero}`);

    // Criar um pedido pendente
    console.log('2. Criando pedido pendente...');
    const pendenteResponse = await api.post('/pedidos', {
      contrato_id: 1,
      escola_id: 1,
      observacoes: 'Pedido de teste - Pendente',
      itens: [
        {
          contrato_produto_id: 1,
          quantidade: 15
        }
      ]
    });
    console.log(`✅ Pedido pendente criado: ${pendenteResponse.data.data.numero}`);

    // Aprovar o pedido para criar um aprovado
    const pedidoId = pendenteResponse.data.data.id;
    console.log('3. Aprovando pedido para criar status aprovado...');
    await api.patch(`/pedidos/${pedidoId}/status`, { status: 'aprovado' });
    console.log(`✅ Pedido aprovado: ${pendenteResponse.data.data.numero}`);

  } catch (error) {
    console.error('❌ Erro ao criar pedidos de teste:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Dados:', error.response.data);
    }
  }
}

// Executar testes
async function executarTestes() {
  console.log('🚀 Iniciando testes de exclusão em qualquer fase\n');
  console.log('=' .repeat(60));
  
  // Descomente a linha abaixo se quiser criar pedidos de teste primeiro
  // await criarPedidosTeste();
  
  await testarExclusaoQualquerFase();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Testes concluídos!');
}

// Verificar se o script está sendo executado diretamente
if (require.main === module) {
  executarTestes().catch(console.error);
}

module.exports = {
  testarExclusaoQualquerFase,
  criarPedidosTeste
};