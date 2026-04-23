const https = require('https');

async function testLoginVercel() {
  console.log('🔐 Testando login na PRODUÇÃO Vercel...\n');
  
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
      'Origin': 'https://nutriescola.vercel.app',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  };

  return new Promise((resolve, reject) => {
    console.log('📡 Enviando requisição para:', `https://${loginOptions.hostname}${loginOptions.path}`);
    console.log('📧 Email:', 'ewenunes0@gmail.com');
    console.log('');

    const req = https.request(loginOptions, (res) => {
      let body = '';

      console.log('📊 Status Code:', res.statusCode);
      console.log('📋 Headers:', JSON.stringify(res.headers, null, 2));
      console.log('');

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        console.log('📦 Resposta completa:');
        console.log(body);
        console.log('');

        try {
          const response = JSON.parse(body);
          
          if (response.success) {
            console.log('✅ Login bem-sucedido!');
            console.log('Token:', response.data.token ? response.data.token.substring(0, 50) + '...' : 'AUSENTE');
            console.log('Tipo:', response.data.tipo);
            console.log('Nome:', response.data.nome);
            console.log('Escola ID:', response.data.escola_id);
            
            // Decodificar token
            if (response.data.token) {
              try {
                const payload = JSON.parse(Buffer.from(response.data.token.split('.')[1], 'base64').toString());
                console.log('');
                console.log('🔍 Payload do Token:');
                console.log(JSON.stringify(payload, null, 2));
              } catch (e) {
                console.log('⚠️ Erro ao decodificar token:', e.message);
              }
            }
          } else {
            console.log('❌ Login falhou');
            console.log('Mensagem:', response.message || 'Sem mensagem');
            console.log('Erro:', response.error || 'Sem erro');
          }
        } catch (e) {
          console.log('❌ Erro ao parsear JSON:', e.message);
          console.log('Body recebido:', body);
        }
        
        resolve();
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

testLoginVercel().catch(console.error);
