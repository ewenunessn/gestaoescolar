const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function testCriarPedido() {
  try {
    console.log('🧪 Testando criação de pedido...\n');
    
    // Primeiro, vamos listar os tenants para pegar um ID válido
    const tenantsResponse = await axios.get(`${API_BASE_URL}/api/tenants`);
    const tenants = tenantsResponse.data.data || tenantsResponse.data;
    
    if (!tenants || tenants.length === 0) {
      console.log('❌ Nenhum tenant encontrado');
      return;
    }
    
    const tenant = tenants[0];
    console.log(`📋 Usando tenant: ${tenant.name} (ID: ${tenant.id})\n`);
    
    const headers = {
      'X-Tenant-ID': tenant.id,
      'Content-Type': 'application/json'
    };

    // Buscar contratos e produtos para criar um pedido válido
    console.log('🔍 Buscando contratos disponíveis...');
    const contratosResponse = await axios.get(`${API_BASE_URL}/api/contratos`, { headers });
    const contratos = contratosResponse.data.data || [];
    
    if (contratos.length === 0) {
      console.log('❌ Nenhum contrato encontrado');
      return;
    }
    
    console.log(`✅ Encontrados ${contratos.length} contratos`);
    
    // Buscar produtos do primeiro contrato
    const contrato = contratos[0];
    console.log(`🔍 Buscando produtos do contrato: ${contrato.numero}`);
    
    const contratoProdutosResponse = await axios.get(
      `${API_BASE_URL}/api/contrato-produtos/contrato/${contrato.id}`, 
      { headers }
    );
    const contratoProdutos = contratoProdutosResponse.data.data || [];
    
    if (contratoProdutos.length === 0) {
      console.log('❌ Nenhum produto encontrado no contrato');
      return;
    }
    
    console.log(`✅ Encontrados ${contratoProdutos.length} produtos no contrato`);
    
    // Criar pedido de teste
    const pedidoData = {
      observacoes: `Pedido de teste criado em ${new Date().toISOString()}`,
      salvar_como_rascunho: false,
      itens: [
        {
          contrato_produto_id: contratoProdutos[0].id,
          quantidade: 10,
          data_entrega_prevista: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 dias
          observacoes: 'Item de teste'
        }
      ]
    };
    
    console.log('📝 Dados do pedido:', JSON.stringify(pedidoData, null, 2));
    
    // Criar pedido
    console.log('\n🚀 Criando pedido...');
    const pedidoResponse = await axios.post(
      `${API_BASE_URL}/api/pedidos`,
      pedidoData,
      { headers }
    );
    
    if (pedidoResponse.data.success) {
      console.log('✅ Pedido criado com sucesso!');
      console.log('📋 Dados do pedido criado:', {
        id: pedidoResponse.data.data.id,
        numero: pedidoResponse.data.data.numero,
        status: pedidoResponse.data.data.status,
        valor_total: pedidoResponse.data.data.valor_total,
        tenant_id: pedidoResponse.data.data.tenant_id
      });
      
      // Verificar se o pedido aparece na listagem
      console.log('\n🔍 Verificando se o pedido aparece na listagem...');
      const listResponse = await axios.get(`${API_BASE_URL}/api/pedidos`, { headers });
      const pedidos = listResponse.data.data || [];
      
      const pedidoCriado = pedidos.find(p => p.id === pedidoResponse.data.data.id);
      if (pedidoCriado) {
        console.log('✅ Pedido encontrado na listagem!');
        console.log('🎉 Teste PASSOU - Pedido criado e aparece na listagem!');
      } else {
        console.log('❌ Pedido NÃO encontrado na listagem');
      }
    } else {
      console.log('❌ Erro ao criar pedido:', pedidoResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data || error.message);
    if (error.response?.status === 500) {
      console.log('\n🔍 Erro 500 - verificar logs do servidor para mais detalhes');
    }
  }
}

testCriarPedido();