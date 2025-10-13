// Script para testar JWT no Vercel
const axios = require('axios');

async function debugJWT() {
  try {
    // Criar uma rota de debug temporária
    console.log('🔍 Testando debug JWT...');
    
    const response = await axios.get('https://gestaoescolar-backend.vercel.app/api/debug-jwt');
    console.log('Debug response:', response.data);
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

debugJWT();