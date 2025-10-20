const axios = require('axios');

const baseURL = 'http://localhost:3001/api';

async function debugRotasFiltradas() {
  console.log('🔍 Debug: Rotas Filtradas\n');

  try {
    // Fazer login primeiro
    console.log('0. Fazendo login...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'ewenunes0@gmail.com',
      senha: '123456'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login realizado com sucesso');
    
    // Configurar headers para todas as requisições
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    // 1. Verificar configuração ativa
    console.log('\n1. Verificando configuração ativa...');
    const configResponse = await axios.get(`${baseURL}/entregas/configuracao`, { headers });
    console.log('✅ Configuração ativa:', JSON.stringify(configResponse.data, null, 2));
    
    const config = configResponse.data.data;
    console.log(`📋 Guia ID: ${config.guiaId}`);
    console.log(`📋 Rotas selecionadas: [${config.rotasSelecionadas.join(', ')}]`);
    console.log(`📋 Itens selecionados: [${config.itensSelecionados.join(', ')}]`);

    // 2. Testar rotas com entregas (método original)
    console.log('\n2. Testando rotas com entregas (método original)...');
    const rotasOriginaisResponse = await axios.get(`${baseURL}/entregas/rotas-entregas?guiaId=${config.guiaId}`, { headers });
    console.log(`✅ Rotas originais: ${rotasOriginaisResponse.data.length} rotas`);
    rotasOriginaisResponse.data.forEach(rota => {
      console.log(`   - Rota ${rota.id}: ${rota.nome} (${rota.total_escolas} escolas, ${rota.total_itens} itens)`);
    });

    // 3. Testar rotas filtradas
    console.log('\n3. Testando rotas filtradas...');
    const rotasFiltradas = await axios.get(`${baseURL}/entregas/rotas-filtradas`, { headers });
    console.log(`✅ Rotas filtradas: ${rotasFiltradas.data.length} rotas`);
    rotasFiltradas.data.forEach(rota => {
      console.log(`   - Rota ${rota.id}: ${rota.nome} (${rota.total_escolas} escolas, ${rota.total_itens} itens)`);
    });

    // 4. Verificar se as rotas selecionadas existem nas rotas originais
    console.log('\n4. Verificando correspondência...');
    const rotasOriginaisIds = rotasOriginaisResponse.data.map(r => r.id);
    console.log(`📋 IDs das rotas originais: [${rotasOriginaisIds.join(', ')}]`);
    
    config.rotasSelecionadas.forEach(rotaId => {
      const existe = rotasOriginaisIds.includes(rotaId);
      console.log(`   - Rota ${rotaId}: ${existe ? '✅ Existe' : '❌ Não existe'} nas rotas originais`);
    });

    // 5. Testar todas as rotas (sem filtro de guia)
    console.log('\n5. Testando todas as rotas (sem filtro)...');
    const todasRotasResponse = await axios.get(`${baseURL}/entregas/rotas-entregas`, { headers });
    console.log(`✅ Todas as rotas: ${todasRotasResponse.data.length} rotas`);
    todasRotasResponse.data.forEach(rota => {
      console.log(`   - Rota ${rota.id}: ${rota.nome} (guia: ${rota.guia_id})`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

debugRotasFiltradas();