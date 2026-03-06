const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

async function testarRotasRefeicaoProdutos() {
  console.log('🧪 Testando rotas de produtos de refeição...\n');

  try {
    // 1. Listar refeições
    console.log('1️⃣ Listando refeições...');
    const refeicoesRes = await axios.get(`${API_URL}/refeicoes`);
    const refeicoes = refeicoesRes.data.data || refeicoesRes.data;
    console.log(`✅ ${refeicoes.length} refeições encontradas`);
    
    if (refeicoes.length === 0) {
      console.log('⚠️ Nenhuma refeição cadastrada. Crie uma refeição primeiro.');
      return;
    }

    const refeicaoId = refeicoes[0].id;
    console.log(`📝 Usando refeição ID: ${refeicaoId} - ${refeicoes[0].nome}\n`);

    // 2. Listar produtos da refeição
    console.log('2️⃣ Listando produtos da refeição...');
    const produtosRes = await axios.get(`${API_URL}/refeicoes/${refeicaoId}/produtos`);
    const produtos = produtosRes.data;
    console.log(`✅ ${produtos.length} produtos encontrados`);
    console.log('Produtos:', JSON.stringify(produtos, null, 2));
    console.log();

    // 3. Listar todos os produtos disponíveis
    console.log('3️⃣ Listando produtos disponíveis...');
    const todosProdutosRes = await axios.get(`${API_URL}/produtos`);
    const todosProdutos = todosProdutosRes.data.data || todosProdutosRes.data;
    console.log(`✅ ${todosProdutos.length} produtos disponíveis no sistema`);
    
    if (todosProdutos.length === 0) {
      console.log('⚠️ Nenhum produto cadastrado. Cadastre produtos primeiro.');
      return;
    }

    const produtoId = todosProdutos[0].id;
    console.log(`📦 Usando produto ID: ${produtoId} - ${todosProdutos[0].nome}\n`);

    // 4. Adicionar produto à refeição (se ainda não estiver)
    const jaExiste = produtos.some(p => p.produto_id === produtoId);
    
    if (!jaExiste) {
      console.log('4️⃣ Adicionando produto à refeição...');
      const addRes = await axios.post(`${API_URL}/refeicoes/${refeicaoId}/produtos`, {
        produto_id: produtoId,
        per_capita: 150,
        tipo_medida: 'gramas'
      });
      console.log('✅ Produto adicionado:', addRes.data);
      console.log();
    } else {
      console.log('4️⃣ Produto já está na refeição, pulando adição...\n');
    }

    // 5. Listar novamente para ver o produto adicionado
    console.log('5️⃣ Listando produtos da refeição novamente...');
    const produtosRes2 = await axios.get(`${API_URL}/refeicoes/${refeicaoId}/produtos`);
    const produtos2 = produtosRes2.data;
    console.log(`✅ ${produtos2.length} produtos encontrados`);
    
    if (produtos2.length > 0) {
      const assocId = produtos2[0].id;
      console.log(`🔗 Usando associação ID: ${assocId}\n`);

      // 6. Editar per capita
      console.log('6️⃣ Editando quantidade per capita...');
      const editRes = await axios.put(`${API_URL}/refeicoes/produtos/${assocId}`, {
        per_capita: 200,
        tipo_medida: 'gramas'
      });
      console.log('✅ Quantidade atualizada:', editRes.data);
      console.log();

      // 7. Verificar alteração
      console.log('7️⃣ Verificando alteração...');
      const produtosRes3 = await axios.get(`${API_URL}/refeicoes/${refeicaoId}/produtos`);
      const produtoAtualizado = produtosRes3.data.find(p => p.id === assocId);
      console.log('✅ Produto atualizado:', produtoAtualizado);
      console.log();
    }

    console.log('✅ Todos os testes passaram!\n');
    console.log('📋 Resumo das rotas testadas:');
    console.log(`   GET    ${API_URL}/refeicoes`);
    console.log(`   GET    ${API_URL}/refeicoes/:id/produtos`);
    console.log(`   POST   ${API_URL}/refeicoes/:id/produtos`);
    console.log(`   PUT    ${API_URL}/refeicoes/produtos/:id`);
    console.log(`   DELETE ${API_URL}/refeicoes/produtos/:id`);

  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testarRotasRefeicaoProdutos();
