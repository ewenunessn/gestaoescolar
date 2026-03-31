const fetch = require('node-fetch');

async function testarEndpoint() {
  try {
    console.log('🔍 Testando endpoint /api/escola-modalidades/escola/85...\n');
    
    const url = 'http://localhost:3000/api/escola-modalidades/escola/85';
    console.log('📡 URL:', url);
    
    const response = await fetch(url);
    console.log('📊 Status:', response.status, response.statusText);
    
    const data = await response.json();
    console.log('📦 Resposta:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testarEndpoint();
