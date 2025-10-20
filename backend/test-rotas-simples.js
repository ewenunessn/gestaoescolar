const axios = require('axios');

const baseURL = 'http://localhost:3001/api';

async function testarRotas() {
  try {
    console.log('🧪 Testando rotas filtradas...\n');

    // Login
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'ewenunes0@gmail.com',
      senha: '123456'
    });
    
    const headers = {
      'Authorization': `Bearer ${loginResponse.data.token}`,
      'Content-Type': 'application/json'
    };

    // 1. Verificar configuração
    console.log('1. Verificando configuração ativa...');
    const configResponse = await axios.get(`${baseURL}/entregas/configuracao`, { headers });
    console.log('✅ Configuração:', configResponse.data.data);

    // 2. Testar rotas filtradas
    console.log('\n2. Testando rotas filtradas...');
    const rotasFiltradas = await axios.get(`${baseURL}/entregas/rotas-filtradas`, { headers });
    console.log(`✅ ${rotasFiltradas.data.length} rotas filtradas encontradas:`);
    rotasFiltradas.data.forEach(rota => {
      console.log(`   - ID: ${rota.id}, Nome: ${rota.nome}, Escolas: ${rota.total_escolas}`);
    });

    // 3. Comparar com todas as rotas
    console.log('\n3. Comparando com todas as rotas...');
    const todasRotas = await axios.get(`${baseURL}/entregas/rotas`, { headers });
    console.log(`📋 ${todasRotas.data.length} rotas totais:`);
    todasRotas.data.forEach(rota => {
      console.log(`   - ID: ${rota.id}, Nome: ${rota.nome}, Ativo: ${rota.ativo}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

testarRotas();