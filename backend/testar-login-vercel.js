const https = require('https');

const API_URL = 'https://gestaoescolar-backend.vercel.app';

// Função para fazer requisição POST
function makeRequest(path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'gestaoescolar-backend.vercel.app',
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Origin': 'https://gestaoescolar-frontend.vercel.app'
      }
    };

    console.log(`\n🔍 Testando: ${API_URL}${path}`);
    console.log('📤 Dados:', data);

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        console.log(`\n📊 Status: ${res.statusCode}`);
        console.log('📋 Headers:', res.headers);
        
        try {
          const jsonBody = JSON.parse(body);
          console.log('✅ Resposta:', JSON.stringify(jsonBody, null, 2));
          resolve({ status: res.statusCode, data: jsonBody, headers: res.headers });
        } catch (e) {
          console.log('📄 Resposta (texto):', body);
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Erro:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Testar endpoints
async function testarAPI() {
  console.log('🚀 Iniciando testes da API no Vercel...\n');
  console.log('=' .repeat(60));

  try {
    // 1. Testar Health
    console.log('\n1️⃣ TESTANDO HEALTH CHECK');
    console.log('=' .repeat(60));
    await new Promise((resolve, reject) => {
      https.get(`${API_URL}/health`, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          console.log(`Status: ${res.statusCode}`);
          console.log('Resposta:', JSON.parse(body));
          resolve();
        });
      }).on('error', reject);
    });

    // 2. Testar Login com credenciais inválidas
    console.log('\n2️⃣ TESTANDO LOGIN (credenciais inválidas)');
    console.log('=' .repeat(60));
    await makeRequest('/api/auth/login', {
      email: 'teste@invalido.com',
      senha: 'senhaerrada'
    });

    // 3. Testar Login com credenciais válidas (se souber)
    console.log('\n3️⃣ TESTANDO LOGIN (credenciais válidas - admin)');
    console.log('=' .repeat(60));
    await makeRequest('/api/auth/login', {
      email: 'admin@admin.com',
      senha: 'admin123'
    });

    // 4. Testar rota protegida sem token
    console.log('\n4️⃣ TESTANDO ROTA PROTEGIDA (sem token)');
    console.log('=' .repeat(60));
    await new Promise((resolve, reject) => {
      https.get(`${API_URL}/api/escolas`, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          console.log(`Status: ${res.statusCode}`);
          try {
            console.log('Resposta:', JSON.parse(body));
          } catch {
            console.log('Resposta:', body);
          }
          resolve();
        });
      }).on('error', reject);
    });

    console.log('\n' + '=' .repeat(60));
    console.log('✅ Testes concluídos!');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('\n❌ Erro durante os testes:', error.message);
  }
}

// Executar testes
testarAPI();
