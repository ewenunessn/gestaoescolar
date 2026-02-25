const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
let AUTH_TOKEN = '';

async function loginOrRegister() {
  const email = 'admin@sistema.com';
  const password = 'admin'; // Tentativa comum
  
  try {
    console.log(`🔐 Tentando login com ${email}...`);
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email,
      senha: password
    });
    
    if (loginRes.data.token) {
      console.log('✅ Login realizado com sucesso!');
      AUTH_TOKEN = loginRes.data.token;
      return true;
    }
  } catch (error) {
    console.log('⚠️ Login falhou. Tentando registrar novo usuário de teste...');
  }

  // Tentar registrar
  const testUser = {
    nome: 'Usuário Teste Guia',
    email: `teste_guia_${Date.now()}@sistema.com`,
    senha: 'senha_teste_123',
    perfil: 'admin',
    cargo: 'Testador',
    departamento: 'TI'
  };

  try {
    console.log(`📝 Registrando novo usuário: ${testUser.email}...`);
    // Tentar rota /auth/register ou /usuarios/register
    let registerUrl = `${BASE_URL}/auth/register`;
    
    try {
        await axios.post(registerUrl, testUser);
    } catch (e) {
        registerUrl = `${BASE_URL}/usuarios/register`;
        await axios.post(registerUrl, testUser);
    }

    console.log('✅ Usuário registrado! Realizando login...');
    
    // Login com o novo usuário
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      senha: testUser.senha
    });

    if (loginRes.data.token) {
      console.log('✅ Login realizado com sucesso!');
      AUTH_TOKEN = loginRes.data.token;
      return true;
    }
  } catch (error) {
    console.error('❌ Falha ao registrar/logar:', error.message);
    if (error.response) {
        console.error('Dados:', error.response.data);
    }
    return false;
  }
  
  return false;
}

async function testGuiasApi() {
  console.log('🚀 Iniciando teste da API de Guias de Demanda...');

  // Autenticação
  if (!await loginOrRegister()) {
    console.error('❌ Não foi possível autenticar. Abortando teste.');
    return;
  }
  
  // Configurar headers com token
  const config = {
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
  };

  try {
    // 1. Listar escolas para pegar um ID
    console.log('\n1. Listando escolas...');
    const escolasRes = await axios.get(`${BASE_URL}/escolas`, config);
    const escolas = escolasRes.data.data || escolasRes.data;
    
    if (escolas.length === 0) {
      console.error('❌ Nenhuma escola encontrada. Cadastre uma escola antes de testar.');
      return;
    }
    
    const escola = escolas[0];
    console.log(`✅ Escola selecionada: ${escola.nome} (ID: ${escola.id})`);

    // 2. Listar produtos para pegar um ID
    console.log('\n2. Listando produtos...');
    const produtosRes = await axios.get(`${BASE_URL}/produtos`, config);
    const produtos = produtosRes.data.data || produtosRes.data;
    
    if (produtos.length === 0) {
      console.error('❌ Nenhum produto encontrado. Cadastre um produto antes de testar.');
      return;
    }
    
    const produto = produtos[0];
    console.log(`✅ Produto selecionado: ${produto.nome} (ID: ${produto.id})`);

    // 3. Adicionar produto à escola (deve criar guia automaticamente)
    console.log('\n3. Adicionando produto à escola...');
    const dataEntrega = new Date();
    dataEntrega.setDate(dataEntrega.getDate() + 7); // Daqui a 7 dias
    
    const payload = {
      produtoId: produto.id,
      quantidade: 10,
      unidade: 'KG',
      data_entrega: dataEntrega.toISOString().split('T')[0],
      observacao: 'Teste automatizado',
      status: 'pendente'
    };
    
    const addRes = await axios.post(`${BASE_URL}/guias/escola/${escola.id}/produtos`, payload, config);
    console.log('✅ Produto adicionado com sucesso:', addRes.data);

    // 4. Listar produtos da escola para verificar
    console.log('\n4. Listando produtos da escola...');
    const mes = dataEntrega.getMonth() + 1;
    const ano = dataEntrega.getFullYear();
    
    const listRes = await axios.get(`${BASE_URL}/guias/escola/${escola.id}/produtos`, {
      ...config,
      params: { mes, ano }
    });
    
    const produtosEscola = listRes.data.data || listRes.data;
    console.log(`✅ Encontrados ${produtosEscola.length} produtos para a escola neste mês/ano.`);
    
    const produtoAdicionado = produtosEscola.find(p => p.produto_id === produto.id && Math.abs(p.quantidade - 10) < 0.01);
    
    if (produtoAdicionado) {
      console.log('✅ Verificação bem sucedida! O produto foi encontrado na lista.');
      console.log('Status:', produtoAdicionado.status);
      console.log('Data Entrega:', produtoAdicionado.data_entrega);
    } else {
      console.error('❌ O produto adicionado não foi encontrado na lista.');
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testGuiasApi();
