const axios = require('axios');

const BASE_URL = 'https://gestaoescolar-backend.vercel.app/api';

async function debugEstoqueEscola() {
  try {
    console.log('=== DEBUG ESTOQUE ESCOLA ===\n');
    
    // Fazer login primeiro
    console.log('0. Fazendo login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'ewenunes0@gmail.com',
      senha: '@Nunes8922'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login realizado com sucesso\n');
    
    // Configurar axios com o token
    const api = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Primeiro, buscar a escola "EMEF Prof. Didi"
    console.log('1. Buscando escola "EMEF Prof. Didi"...');
    const escolasResponse = await api.get('/escolas');
    const escolas = Array.isArray(escolasResponse.data) ? escolasResponse.data : escolasResponse.data.data || [];
    const escola = escolas.find(e => e.nome.includes('EMEF Prof. Didi'));
    
    if (!escola) {
      console.log('❌ Escola não encontrada!');
      return;
    }
    
    console.log(`✅ Escola encontrada: ID ${escola.id} - ${escola.nome}\n`);
    
    // Chamar o endpoint de debug
    console.log('2. Chamando endpoint de debug...');
    const debugResponse = await api.get(`/estoque-escolar/escolas/${escola.id}/debug`);
    
    console.log('\n=== RESULTADO DO DEBUG ===\n');
    console.log(JSON.stringify(debugResponse.data, null, 2));
    
    // Análise específica para banana
    const debug = debugResponse.data.debug;
    console.log('\n=== ANÁLISE BANANA ===');
    console.log(`Total de registros de estoque: ${debug.total_registros_estoque}`);
    console.log(`Registros de banana (direto): ${debug.banana_direto.length}`);
    console.log(`Registros de banana (query controller): ${debug.banana_controller_query.length}`);
    
    if (debug.banana_direto.length > 0) {
      console.log('\nDados da banana (direto):');
      debug.banana_direto.forEach(b => {
        console.log(`  - Produto ID: ${b.produto_id}, Nome: ${b.produto_nome}, Quantidade: ${b.quantidade_atual}`);
      });
    }
    
    if (debug.banana_controller_query.length > 0) {
      console.log('\nDados da banana (query controller):');
      debug.banana_controller_query.forEach(b => {
        console.log(`  - Produto ID: ${b.produto_id}, Nome: ${b.produto_nome}, Quantidade: ${b.quantidade_atual}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

debugEstoqueEscola();
