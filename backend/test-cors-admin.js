const axios = require('axios');

const API_URL = 'https://gestaoescolar-backend-seven.vercel.app';

async function testCORS() {
  console.log('🧪 Testando CORS do admin panel...\n');

  try {
    const response = await axios.post(`${API_URL}/api/system-admin/auth/login`, {
      username: 'admin',
      password: 'admin123'
    }, {
      headers: {
        'Origin': 'https://gestaoescolar-frontend-painel-39qa46sgo-ewerton-nunes-projects.vercel.app',
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Resposta recebida:', response.status);
    console.log('Headers CORS:', {
      'access-control-allow-origin': response.headers['access-control-allow-origin'],
      'access-control-allow-credentials': response.headers['access-control-allow-credentials']
    });
  } catch (error) {
    console.log('❌ Erro:', error.response?.status, error.response?.data || error.message);
    console.log('Headers da resposta:', error.response?.headers);
  }
}

testCORS();
