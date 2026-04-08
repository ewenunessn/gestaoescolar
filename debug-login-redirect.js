const https = require('https');

async function testLoginAndRedirect() {
  console.log('🔐 Testando login e requisições subsequentes...\n');
  
  // Passo 1: Login
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
          
          console.log('✅ Passo 1: Login');
          console.log('Status:', res.statusCode);
          console.log('Success:', response.success);
          
          if (!response.success) {
            console.log('❌ Login falhou:', response);
            reject(new Error('Login falhou'));
            return;
          }

          const { token, tipo } = response.data;
          console.log('Token recebido:', token.substring(0, 50) + '...');
          console.log('Tipo de usuário:', tipo);
          console.log('');

          // Passo 2: Testar endpoint /usuarios/me (que o frontend provavelmente chama)
          console.log('🔍 Passo 2: Testando /usuarios/me com o token...');
          
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

          const meReq = https.request(meOptions, (meRes) => {
            let meBody = '';

            meRes.on('data', (chunk) => {
              meBody += chunk;
            });

            meRes.on('end', () => {
              console.log('Status /usuarios/me:', meRes.statusCode);
              console.log('Headers:', JSON.stringify(meRes.headers, null, 2));
              
              try {
                const meData = JSON.parse(meBody);
                console.log('Resposta:', JSON.stringify(meData, null, 2));
              } catch (e) {
                console.log('Resposta (raw):', meBody);
              }
              
              if (meRes.statusCode === 401) {
                console.log('');
                console.log('❌ PROBLEMA ENCONTRADO: /usuarios/me retornou 401!');
                console.log('Isso explica por que o frontend está redirecionando de volta ao login.');
              } else {
                console.log('');
                console.log('✅ /usuarios/me funcionou corretamente');
              }
              
              resolve();
            });
          });

          meReq.on('error', (error) => {
            console.error('❌ Erro ao chamar /usuarios/me:', error.message);
            reject(error);
          });

          meReq.end();

        } catch (e) {
          console.error('❌ Erro ao processar resposta:', e.message);
          console.log('Body:', body);
          reject(e);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Erro na requisição de login:', error.message);
      reject(error);
    });

    req.write(loginData);
    req.end();
  });
}

testLoginAndRedirect().catch(console.error);
