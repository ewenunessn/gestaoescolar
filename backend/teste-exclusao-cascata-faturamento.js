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

async function testarExclusaoCascataFaturamento() {
  console.log('🧪 Testando exclusão em cascata de faturamentos...\n');

  try {
    // 1. Listar pedidos disponíveis
    console.log('1. Listando pedidos disponíveis...');
    const pedidosResponse = await api.get('/pedidos');
    const pedidos = pedidosResponse.data.data || [];
    
    console.log(`✅ Encontrados ${pedidos.length} pedidos`);
    
    if (pedidos.length === 0) {
      console.log('❌ Nenhum pedido encontrado para testar');
      return;
    }

    // Encontrar um pedido que não seja rascunho para testar
    const pedidoTeste = pedidos.find(p => p.status !== 'rascunho');
    
    if (!pedidoTeste) {
      console.log('❌ Nenhum pedido não-rascunho encontrado para testar');
      return;
    }

    console.log(`📋 Usando pedido ${pedidoTeste.numero} (ID: ${pedidoTeste.id}) para teste`);

    // 2. Verificar se já existe faturamento para este pedido
    console.log('\n2. Verificando faturamentos existentes...');
    
    try {
      const faturamentosResponse = await api.get(`/pedidos/${pedidoTeste.id}/faturamentos`);
      const faturamentosExistentes = faturamentosResponse.data.data || [];
      
      console.log(`📊 Faturamentos existentes: ${faturamentosExistentes.length}`);
      
      if (faturamentosExistentes.length > 0) {
        console.log('📄 Faturamentos encontrados:');
        faturamentosExistentes.forEach(fat => {
          console.log(`  - ${fat.numero} (Status: ${fat.status}, Valor: R$ ${fat.valor_total})`);
        });
      }

      // 3. Se não houver faturamento, criar um
      let faturamentoId = null;
      
      if (faturamentosExistentes.length === 0) {
        console.log('\n3. Criando faturamento para teste...');
        
        try {
          const faturamentoResponse = await api.post(`/pedidos/${pedidoTeste.id}/faturamento`, {
            observacoes: 'Faturamento de teste para exclusão em cascata'
          });
          
          const faturamento = faturamentoResponse.data.data.faturamento;
          faturamentoId = faturamento.id;
          
          console.log(`✅ Faturamento criado: ${faturamento.numero} (ID: ${faturamentoId})`);
        } catch (error) {
          if (error.response?.data?.message?.includes('Já existe um faturamento')) {
            console.log('⚠️  Já existe um faturamento para este pedido');
            faturamentoId = faturamentosExistentes[0].id;
          } else {
            throw error;
          }
        }
      } else {
        faturamentoId = faturamentosExistentes[0].id;
      }

      // 4. Verificar detalhes do faturamento antes da exclusão
      console.log('\n4. Verificando detalhes do faturamento antes da exclusão...');
      
      const detalhesResponse = await api.get(`/faturamentos/${faturamentoId}`);
      const detalhes = detalhesResponse.data.data;
      
      console.log(`📄 Faturamento ${detalhes.numero}:`);
      console.log(`   - Status: ${detalhes.status}`);
      console.log(`   - Valor: R$ ${detalhes.valor_total}`);
      console.log(`   - Total de itens: ${detalhes.itens.length}`);

      // 5. Contar registros antes da exclusão
      console.log('\n5. Contando registros antes da exclusão...');
      
      const db = require('./dist/database.js');
      
      const faturamentosAntes = await db.query('SELECT COUNT(*) as total FROM faturamentos WHERE pedido_id = $1', [pedidoTeste.id]);
      const itensAntes = await db.query('SELECT COUNT(*) as total FROM faturamento_itens WHERE faturamento_id = $1', [faturamentoId]);
      
      console.log(`📊 Registros antes da exclusão:`);
      console.log(`   - Faturamentos do pedido: ${faturamentosAntes.rows[0].total}`);
      console.log(`   - Itens do faturamento: ${itensAntes.rows[0].total}`);

      // 6. Excluir o pedido
      console.log(`\n6. Excluindo pedido ${pedidoTeste.numero}...`);
      
      try {
        await api.delete(`/pedidos/${pedidoTeste.id}`);
        console.log(`✅ Pedido ${pedidoTeste.numero} excluído com sucesso`);
      } catch (error) {
        console.log(`❌ Erro ao excluir pedido: ${error.response?.data?.message || error.message}`);
        return;
      }

      // 7. Verificar se os faturamentos foram excluídos em cascata
      console.log('\n7. Verificando exclusão em cascata...');
      
      const faturamentosDepois = await db.query('SELECT COUNT(*) as total FROM faturamentos WHERE pedido_id = $1', [pedidoTeste.id]);
      const itensDepois = await db.query('SELECT COUNT(*) as total FROM faturamento_itens WHERE faturamento_id = $1', [faturamentoId]);
      
      console.log(`📊 Registros após a exclusão:`);
      console.log(`   - Faturamentos do pedido: ${faturamentosDepois.rows[0].total}`);
      console.log(`   - Itens do faturamento: ${itensDepois.rows[0].total}`);

      // 8. Verificar se a exclusão foi bem-sucedida
      if (faturamentosDepois.rows[0].total === 0 && itensDepois.rows[0].total === 0) {
        console.log('\n🎉 SUCESSO! Exclusão em cascata funcionou corretamente:');
        console.log('   ✅ Pedido excluído');
        console.log('   ✅ Faturamentos excluídos automaticamente');
        console.log('   ✅ Itens de faturamento excluídos automaticamente');
        console.log('\n📋 Resumo da exclusão em cascata:');
        console.log(`   - Faturamentos excluídos: ${faturamentosAntes.rows[0].total}`);
        console.log(`   - Itens de faturamento excluídos: ${itensAntes.rows[0].total}`);
      } else {
        console.log('\n❌ FALHA! Exclusão em cascata não funcionou:');
        console.log(`   - Faturamentos restantes: ${faturamentosDepois.rows[0].total} (deveria ser 0)`);
        console.log(`   - Itens restantes: ${itensDepois.rows[0].total} (deveria ser 0)`);
      }

      // 9. Tentar acessar o faturamento excluído
      console.log('\n9. Verificando se o faturamento ainda é acessível...');
      
      try {
        await api.get(`/faturamentos/${faturamentoId}`);
        console.log('❌ ERRO: Faturamento ainda acessível após exclusão do pedido');
      } catch (error) {
        if (error.response?.status === 404) {
          console.log('✅ Correto: Faturamento não é mais acessível (404)');
        } else {
          console.log(`⚠️  Erro inesperado ao acessar faturamento: ${error.response?.status} - ${error.response?.data?.message}`);
        }
      }

    } catch (error) {
      console.error('❌ Erro durante o teste:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.response?.data || error.message);
  }
}

// Executar teste
async function executarTeste() {
  console.log('🚀 Iniciando teste de exclusão em cascata de faturamentos\n');
  console.log('=' .repeat(70));
  
  await testarExclusaoCascataFaturamento();
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ Teste concluído!');
}

// Verificar se o script está sendo executado diretamente
if (require.main === module) {
  executarTeste().catch(console.error);
}

module.exports = {
  testarExclusaoCascataFaturamento
};