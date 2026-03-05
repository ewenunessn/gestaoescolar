const axios = require('axios');

const BASE_URL = 'https://gestaoescolar-backend.vercel.app/api';

async function buscarBanana20UN() {
  try {
    console.log('=== BUSCAR BANANA 20 UN ===\n');
    
    // Fazer login
    console.log('0. Fazendo login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'ewenunes0@gmail.com',
      senha: '@Nunes8922'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login realizado\n');
    
    const api = axios.create({
      baseURL: BASE_URL,
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    // Buscar todas as escolas
    console.log('1. Buscando todas as escolas...');
    const escolasResponse = await api.get('/escolas');
    const escolas = Array.isArray(escolasResponse.data) ? escolasResponse.data : escolasResponse.data.data || [];
    console.log(`✅ Total de escolas: ${escolas.length}\n`);
    
    // Buscar estoque de banana em todas as escolas
    console.log('2. Buscando estoque de banana em todas as escolas...');
    const escolasComBanana = [];
    
    for (const escola of escolas) {
      try {
        const estoqueResponse = await api.get(`/estoque-escolar/escolas/${escola.id}`);
        const estoque = estoqueResponse.data.data || [];
        
        const banana = estoque.find(item => 
          item.produto_nome && item.produto_nome.toLowerCase().includes('banana')
        );
        
        if (banana && banana.quantidade_atual > 0) {
          escolasComBanana.push({
            escola_id: escola.id,
            escola_nome: escola.nome,
            quantidade: banana.quantidade_atual,
            unidade: banana.unidade
          });
        }
      } catch (err) {
        // Ignorar erros de escolas individuais
      }
    }
    
    console.log('\n=== ESCOLAS COM BANANA EM ESTOQUE ===\n');
    if (escolasComBanana.length === 0) {
      console.log('❌ Nenhuma escola tem banana em estoque');
    } else {
      escolasComBanana.forEach(e => {
        console.log(`✅ ${e.escola_nome} (ID: ${e.escola_id}): ${e.quantidade} ${e.unidade}`);
      });
      
      const com20 = escolasComBanana.filter(e => e.quantidade == 20);
      if (com20.length > 0) {
        console.log('\n=== ESCOLAS COM EXATAMENTE 20 UN ===');
        com20.forEach(e => {
          console.log(`🎯 ${e.escola_nome} (ID: ${e.escola_id}): ${e.quantidade} ${e.unidade}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

buscarBanana20UN();
