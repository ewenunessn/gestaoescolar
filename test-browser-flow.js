// Script para simular exatamente o que o navegador está fazendo
// Execute: node test-browser-flow.js

const https = require('https');

const BACKEND_URL = 'gestaoescolar-backend.vercel.app';
const FRONTEND_ORIGIN = 'https://nutriescola.vercel.app';

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      hostname: BACKEND_URL,
      port: 443,
      path: path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_ORIGIN,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testBrowserFlow() {
  console.log('\n🌐 SIMULANDO FLUXO DO NAVEGADOR\n');
  console.log('=' .repeat(70));
  console.log(`Backend: https://${BACKEND_URL}`);
  console.log(`Frontend Origin: ${FRONTEND_ORIGIN}\n`);

  // Passo 1: Login
  console.log('📋 Passo 1: Login');
  console.log('-'.repeat(70));
  
  try {
    const loginResponse = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'ewenunes0@gmail.com',
        senha: '@Nunes8922'
      }
    });
    
    console.log(`Status: ${loginResponse.status}`);
    
    if (loginResponse.status !== 200) {
      console.log('❌ Login falhou');
      console.log('Resposta:', JSON.stringify(loginResponse.body, null, 2));
      return;
    }
    
    const token = loginResponse.body.data?.token || loginResponse.body.token;
    console.log('✅ Login bem-sucedido');
    console.log(`Token: ${token.substring(0, 50)}...`);
    
    // Decodificar token
    const [headerB64, payloadB64] = token.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
    console.log('\nPayload:', JSON.stringify(payload, null, 2));
    
    // Passo 2: Acessar /dashboard/stats (primeira requisição após login)
    console.log('\n\n📋 Passo 2: GET /api/dashboard/stats');
    console.log('-'.repeat(70));
    console.log('Simulando a primeira requisição após login...');
    
    const statsResponse = await makeRequest('/api/dashboard/stats', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`Status: ${statsResponse.status}`);
    
    if (statsResponse.status === 200) {
      console.log('✅ Requisição bem-sucedida');
      console.log('Dados:', JSON.stringify(statsResponse.body, null, 2));
    } else if (statsResponse.status === 401) {
      console.log('❌ 401 Unauthorized!');
      console.log('Resposta:', JSON.stringify(statsResponse.body, null, 2));
      console.log('\n🔍 ANÁLISE:');
      console.log('   O token foi aceito no login mas rejeitado aqui.');
      console.log('   Possíveis causas:');
      console.log('   1. Token malformado');
      console.log('   2. Header Authorization incorreto');
      console.log('   3. Middleware de autenticação com problema');
      console.log('   4. CORS bloqueando o header');
    }
    
    // Passo 3: Acessar /notificacoes
    console.log('\n\n📋 Passo 3: GET /api/notificacoes');
    console.log('-'.repeat(70));
    
    const notifResponse = await makeRequest('/api/notificacoes', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`Status: ${notifResponse.status}`);
    
    if (notifResponse.status === 200) {
      console.log('✅ Requisição bem-sucedida');
    } else if (notifResponse.status === 401) {
      console.log('❌ 401 Unauthorized');
      console.log('Resposta:', JSON.stringify(notifResponse.body, null, 2));
    }
    
    // Passo 4: Acessar /pnae/dashboard
    console.log('\n\n📋 Passo 4: GET /api/pnae/dashboard');
    console.log('-'.repeat(70));
    
    const pnaeResponse = await makeRequest('/api/pnae/dashboard', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`Status: ${pnaeResponse.status}`);
    
    if (pnaeResponse.status === 200) {
      console.log('✅ Requisição bem-sucedida');
    } else if (pnaeResponse.status === 401) {
      console.log('❌ 401 Unauthorized');
      console.log('Resposta:', JSON.stringify(pnaeResponse.body, null, 2));
    }
    
    // Passo 5: Verificar se o token ainda é válido após alguns segundos
    console.log('\n\n📋 Passo 5: Testar persistência do token');
    console.log('-'.repeat(70));
    console.log('Aguardando 3 segundos...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const retryResponse = await makeRequest('/api/dashboard/stats', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`Status: ${retryResponse.status}`);
    
    if (retryResponse.status === 200) {
      console.log('✅ Token ainda válido');
    } else if (retryResponse.status === 401) {
      console.log('❌ Token inválido após 3 segundos');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }

  console.log('\n' + '=' .repeat(70));
  console.log('\n📊 CONCLUSÃO\n');
  console.log('Se todas as requisições retornaram 200, o backend está OK.');
  console.log('Se alguma retornou 401, há um problema específico naquele endpoint.');
  console.log('\nSe o problema só ocorre no navegador, pode ser:');
  console.log('- CORS bloqueando headers');
  console.log('- Frontend enviando token incorreto');
  console.log('- Cache do navegador');
  console.log('- Extensões do navegador interferindo\n');
}

testBrowserFlow().catch(console.error);
