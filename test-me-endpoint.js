const https = require('https');

async function testMeEndpoint() {
  console.log('🔐 Testando endpoint /usuarios/me...\n');
  
  // Primeiro fazer login para pegar o token
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
    const loginReq = https.request(loginOptions, (loginRes) => {
      let body = '';

      loginRes.on('data', (chunk) => {
        body += chunk;
      });

      loginRes.on('end', () => {
        try {
          const loginResponse = JSON.parse(body);
          
          if (!loginResponse.success) {
            console.log('❌ Login falhou');
            reject(new Error('Login falhou'));
            return;
          }

          const token = loginResponse.data.token;
          console.log('✅ Login bem-sucedido');
          console.log('Token:', token.substring(0, 50) + '...\n');

          // Agora testar o endpoint /usuarios/me
          const meOptions = {
            hostname: 'gestaoescolar-backend.vercel.app',
            port: 443,
            path: '/api/usuarios/me',
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Origin': 'https://nutriescola.vercel.app'
            }
          };

          console.log('📡 Testando GET /api/usuarios/me...');
          console.log('Authorization:', `Bearer ${token.substring(0, 30)}...`);
          console.log('');

          const meReq = https.request(meOptions, (meRes) => {
            let meBody = '';

            meRes.on('data', (chunk) => {
              meBody += chunk;
            });

            meRes.on('end', () => {
              console.log('Status:', meRes.statusCode);
              console.log('Headers:', JSON.stringify(meRes.headers, null, 2));
              console.log('');
              
              try {
                const meResponse = JSON.parse(meBody);
                console.log('Resposta:');
                console.log(JSON.stringify(meResponse, null, 2));
                
                if (meRes.statusCode === 200) {
                  console.log('');
                  console.log('✅ Endpoint /usuarios/me funcionando!');
                } else {
                  console.log('');
                  console.log('❌ Endpoint retornou erro:', meRes.statusCode);
                }
                
                resolve(meResponse);
              } catch (e) {
                console.log('Body:', meBody);
                console.log('');
                console.log('❌ Erro ao parsear resposta:', e.message);
                reject(e);
              }
            });
          });

          meReq.on('error', (error) => {
            console.error('❌ Erro na requisição /me:', error.message);
            reject(error);
          });

          meReq.end();

        } catch (e) {
          console.error('❌ Erro ao processar login:', e.message);
          reject(e);
        }
      });
    });

    loginReq.on('error', (error) => {
      console.error('❌ Erro no login:', error.message);
      reject(error);
    });

    loginReq.write(loginData);
    loginReq.end();
  });
}

testMeEndpoint().catch(console.error);
