const https = require('https');

async function testTokenValidation() {
  console.log('🔐 Passo 1: Fazendo login...\n');
  
  // Fazer login primeiro
  const loginData = JSON.stringify({
    email: 'ewenunes0@gmail.com',
    senha: '@Nunes8922'
  });

  const loginOptions = {
    hostname: 'gestaoescolar-backend.vercel.app',
    port: 443,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length,
      'Origin': 'https://nutriescola.vercel.app'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(loginOptions, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', async () => {
        try {
          const response = JSON.parse(body);
          
          if (!response.success) {
            console.log('❌ Login falhou:', response);
            reject(new Error('Login falhou'));
            return;
          }

          const token = response.data.token;
          console.log('✅ Login bem-sucedido!');
          console.log('Token:', token.substring(0, 50) + '...');
          console.log('');

          // Testar endpoints que estão falhando
          const endpoints = [
            '/api/usuarios/me',
            '/api/dashboard/stats',
            '/api/pnae/dashboard'
          ];

          for (const endpoint of endpoints) {
            console.log(`\n🔍 Testando: ${endpoint}`);
            await testEndpoint(token, endpoint);
          }

          resolve();
        } catch (e) {
          console.error('❌ Erro:', e.message);
          reject(e);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Erro na requisição:', error.message);
      reject(error);
    });

    req.write(loginData);
    req.end();
  });
}

function testEndpoint(token, path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'gestaoescolar-backend.vercel.app',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Origin': 'https://nutriescola.vercel.app'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        console.log(`  Status: ${res.statusCode}`);
        
        if (res.statusCode === 401) {
          console.log('  ❌ ERRO 401 - Token não aceito!');
          console.log('  Headers da resposta:', JSON.stringify(res.headers, null, 2));
          try {
            const errorData = JSON.parse(body);
            console.log('  Mensagem de erro:', errorData);
          } catch (e) {
            console.log('  Resposta (raw):', body);
          }
        } else if (res.statusCode === 200) {
          console.log('  ✅ Sucesso!');
          try {
            const data = JSON.parse(body);
            console.log('  Dados recebidos:', Object.keys(data));
          } catch (e) {
            console.log('  Resposta OK');
          }
        } else {
          console.log(`  ⚠️ Status inesperado: ${res.statusCode}`);
          console.log('  Resposta:', body.substring(0, 200));
        }
        
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error(`  ❌ Erro na requisição: ${error.message}`);
      resolve();
    });

    req.end();
  });
}

testTokenValidation().catch(console.error);
