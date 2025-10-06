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

async function testarSistemaFaturamento() {
  console.log('🧪 Testando sistema de faturamento...\n');

  try {
    // 1. Listar pedidos disponíveis para faturamento
    console.log('1. Listando pedidos disponíveis...');
    const pedidosResponse = await api.get('/pedidos');
    const pedidos = pedidosResponse.data.data || [];
    
    console.log(`✅ Encontrados ${pedidos.length} pedidos`);
    
    // Filtrar pedidos que podem gerar faturamento (não rascunho, não cancelado)
    const pedidosDisponiveis = pedidos.filter(p => !['rascunho', 'cancelado'].includes(p.status));
    
    if (pedidosDisponiveis.length === 0) {
      console.log('❌ Nenhum pedido disponível para faturamento');
      return;
    }
    
    console.log(`📊 Pedidos disponíveis para faturamento: ${pedidosDisponiveis.length}`);
    pedidosDisponiveis.forEach(pedido => {
      console.log(`  - ${pedido.numero} (Status: ${pedido.status}, Valor: R$ ${pedido.valor_total})`);
    });

    // 2. Testar cálculo de prévia para o primeiro pedido disponível
    const pedidoTeste = pedidosDisponiveis[0];
    console.log(`\n2. Calculando prévia para pedido ${pedidoTeste.numero}...`);
    
    try {
      const previaResponse = await api.get(`/pedidos/${pedidoTeste.id}/faturamento/previa`);
      const previa = previaResponse.data.data;
      
      console.log(`✅ Prévia calculada com sucesso!`);
      console.log(`📋 Resumo da prévia:`);
      console.log(`   - Pedido: ${previa.pedido_numero}`);
      console.log(`   - Modalidades: ${previa.resumo.total_modalidades}`);
      console.log(`   - Contratos: ${previa.resumo.total_contratos}`);
      console.log(`   - Fornecedores: ${previa.resumo.total_fornecedores}`);
      console.log(`   - Itens: ${previa.resumo.total_itens}`);
      console.log(`   - Quantidade total: ${previa.resumo.quantidade_total}`);
      console.log(`   - Valor total: R$ ${previa.resumo.valor_total}`);
      
      console.log(`\n📊 Modalidades encontradas:`);
      previa.modalidades.forEach(modalidade => {
        console.log(`   - ${modalidade.nome}: ${modalidade.percentual.toFixed(2)}% (Repasse: R$ ${modalidade.valor_repasse})`);
      });
      
      console.log(`\n📦 Contratos:`);
      previa.contratos.forEach(contrato => {
        console.log(`   - Contrato ${contrato.contrato_numero} (${contrato.fornecedor_nome}): ${contrato.itens.length} itens, R$ ${contrato.valor_total}`);
        
        contrato.itens.forEach(item => {
          console.log(`     • ${item.produto_nome}: ${item.quantidade_original} ${item.unidade_medida}`);
          item.divisoes.forEach(divisao => {
            if (divisao.quantidade > 0) {
              console.log(`       - ${divisao.modalidade_nome}: ${divisao.quantidade} (${divisao.percentual.toFixed(2)}%) = R$ ${divisao.valor.toFixed(2)}`);
            }
          });
        });
      });

      // 3. Testar geração do faturamento
      console.log(`\n3. Gerando faturamento para pedido ${pedidoTeste.numero}...`);
      
      try {
        const faturamentoResponse = await api.post(`/pedidos/${pedidoTeste.id}/faturamento`, {
          observacoes: 'Faturamento de teste gerado automaticamente'
        });
        
        const resultado = faturamentoResponse.data.data;
        const faturamento = resultado.faturamento;
        
        console.log(`✅ Faturamento gerado com sucesso!`);
        console.log(`📄 Faturamento criado:`);
        console.log(`   - ID: ${faturamento.id}`);
        console.log(`   - Número: ${faturamento.numero}`);
        console.log(`   - Data: ${faturamento.data_faturamento}`);
        console.log(`   - Status: ${faturamento.status}`);
        console.log(`   - Valor: R$ ${faturamento.valor_total}`);

        // 4. Buscar detalhes do faturamento gerado
        console.log(`\n4. Buscando detalhes do faturamento ${faturamento.numero}...`);
        
        const detalhesResponse = await api.get(`/faturamentos/${faturamento.id}`);
        const detalhes = detalhesResponse.data.data;
        
        console.log(`✅ Detalhes carregados:`);
        console.log(`   - Total de itens: ${detalhes.itens.length}`);
        
        // Agrupar por modalidade para mostrar resumo
        const itensPorModalidade = {};
        detalhes.itens.forEach(item => {
          if (!itensPorModalidade[item.modalidade_nome]) {
            itensPorModalidade[item.modalidade_nome] = {
              quantidade: 0,
              valor: 0,
              itens: 0
            };
          }
          itensPorModalidade[item.modalidade_nome].quantidade += item.quantidade_modalidade;
          itensPorModalidade[item.modalidade_nome].valor += item.valor_total;
          itensPorModalidade[item.modalidade_nome].itens += 1;
        });
        
        console.log(`📊 Resumo por modalidade:`);
        Object.keys(itensPorModalidade).forEach(modalidade => {
          const dados = itensPorModalidade[modalidade];
          console.log(`   - ${modalidade}: ${dados.itens} itens, Qtd: ${dados.quantidade}, Valor: R$ ${dados.valor.toFixed(2)}`);
        });

        // 5. Obter resumo estruturado
        console.log(`\n5. Obtendo resumo estruturado...`);
        
        const resumoResponse = await api.get(`/faturamentos/${faturamento.id}/resumo`);
        const resumo = resumoResponse.data.data;
        
        console.log(`✅ Resumo estruturado:`);
        resumo.contratos.forEach(contrato => {
          console.log(`📦 Contrato ${contrato.contrato_numero} (${contrato.fornecedor_nome}):`);
          contrato.modalidades.forEach(modalidade => {
            console.log(`   🏷️  ${modalidade.modalidade_nome}${modalidade.modalidade_codigo_financeiro ? ` (${modalidade.modalidade_codigo_financeiro})` : ''}:`);
            modalidade.itens.forEach(item => {
              console.log(`      • ${item.produto_nome}: ${item.quantidade_total} ${item.unidade_medida} = R$ ${item.valor_total.toFixed(2)}`);
            });
            console.log(`      💰 Total modalidade: ${modalidade.quantidade_total} unidades, R$ ${modalidade.valor_total.toFixed(2)}`);
          });
          console.log(`   💰 Total contrato: R$ ${contrato.valor_total.toFixed(2)}\n`);
        });

        console.log(`\n🎉 Teste do sistema de faturamento concluído com sucesso!`);
        console.log(`📄 Faturamento ${faturamento.numero} foi criado e pode ser visualizado no sistema.`);

      } catch (error) {
        if (error.response?.status === 500 && error.response?.data?.message?.includes('Já existe um faturamento')) {
          console.log(`⚠️  Já existe um faturamento para este pedido`);
          
          // Buscar faturamentos existentes
          const faturamentosResponse = await api.get(`/pedidos/${pedidoTeste.id}/faturamentos`);
          const faturamentos = faturamentosResponse.data.data;
          
          console.log(`📄 Faturamentos existentes:`);
          faturamentos.forEach(fat => {
            console.log(`   - ${fat.numero} (${fat.status}) - R$ ${fat.valor_total}`);
          });
        } else {
          throw error;
        }
      }

    } catch (error) {
      console.error('❌ Erro ao calcular prévia:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.response?.data || error.message);
  }
}

// Executar testes
async function executarTestes() {
  console.log('🚀 Iniciando testes do sistema de faturamento\n');
  console.log('=' .repeat(70));
  
  await testarSistemaFaturamento();
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ Testes concluídos!');
}

// Verificar se o script está sendo executado diretamente
if (require.main === module) {
  executarTestes().catch(console.error);
}

module.exports = {
  testarSistemaFaturamento
};