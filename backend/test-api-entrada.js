const axios = require('axios');

const API_URL = 'http://127.0.0.1:3000/api';

async function testarAPIEntrada() {
  console.log('\n🔍 Testando API de entrada no estoque...\n');

  try {
    // Fazer login primeiro
    console.log('🔐 Fazendo login...\n');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'ewenunes0@gmail.com',
      senha: '@Nunes8922'
    });

    const TOKEN = loginResponse.data.data.token;
    console.log('✅ Login realizado com sucesso!\n');

    // Dados de teste
    const dadosEntrada = {
      produto_id: 165, // Frango Inteiro
      quantidade: 50,
      lote: 'TESTE-API-' + Date.now(),
      data_validade: '2025-12-31',
      data_fabricacao: '2025-01-01',
      nota_fiscal: 'NF-12345',
      fornecedor: 'Fornecedor Teste API',
      observacao: 'Teste via API',
      motivo: 'Teste de entrada via API'
    };

    console.log('📦 Dados da entrada:', dadosEntrada);
    console.log('\n🔄 Enviando requisição...\n');

    const response = await axios.post(
      `${API_URL}/estoque-central/entrada`,
      dadosEntrada,
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Resposta da API:', response.data);
    console.log('\n✅ Entrada registrada com sucesso!\n');

  } catch (error) {
    console.error('\n❌ Erro ao testar API:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
    if (error.stack) {
      console.error('\nStack:', error.stack);
    }
  }
}

testarAPIEntrada();
