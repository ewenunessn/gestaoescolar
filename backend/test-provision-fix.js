require('dotenv').config({ path: './backend/.env' });
const axios = require('axios');

// Usar API do backend no Vercel
const API_URL = 'https://gestaoescolar-backend-seven.vercel.app/api';

async function testProvision() {
  try {
    console.log('🧪 Testando provisionamento de instituição...\n');

    // 1. Fazer login como system admin
    console.log('🔐 Fazendo login como system admin...');
    const loginResponse = await axios.post(`${API_URL}/system-admin/auth/login`, {
      email: 'admin@sistema.com',
      password: 'Admin@123'
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Login realizado com sucesso!');
    console.log('🔑 Token:', token.substring(0, 50) + '...\n');

    // 2. Criar instituição
    const testData = {
      institution: {
        name: 'Prefeitura de Teste Fix',
        slug: 'teste-fix',
        legal_name: 'Prefeitura Municipal de Teste Fix',
        document_number: '12345678000199',
        type: 'prefeitura',
        email: 'contato@testefix.gov.br',
        phone: '(11) 1234-5678',
        plan_id: null,
        address: {
          street: 'Rua Teste',
          number: '123',
          city: 'São Paulo',
          state: 'SP',
          zipcode: '01234-567'
        }
      },
      tenant: {
        name: 'Teste Fix',
        slug: 'testefix',
        subdomain: 'testefix'
      },
      admin: {
        nome: 'Admin Teste Fix',
        email: 'admin@testefix.gov.br',
        senha: 'senha123'
      }
    };

    console.log('📤 Enviando requisição para:', `${API_URL}/provisioning/complete`);
    console.log('📦 Dados:', JSON.stringify(testData, null, 2));
    console.log('\n⏳ Aguardando resposta...\n');

    const response = await axios.post(`${API_URL}/provisioning/complete`, testData, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 30000 // 30 segundos
    });

    console.log('✅ Sucesso!');
    console.log('📊 Resposta:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ Erro:', error.message);
    
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📊 Dados:', JSON.stringify(error.response.data, null, 2));
    } else if (error.code === 'ECONNABORTED') {
      console.error('⏱️  Timeout - A requisição demorou mais de 30 segundos');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🔌 Conexão recusada - O servidor não está rodando?');
    }
  }
}

testProvision();
