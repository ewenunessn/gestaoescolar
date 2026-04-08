const https = require('https');

const data = JSON.stringify({
  email: 'ewenunes0@gmail.com',
  senha: '@Nunes8922'
});

const options = {
  hostname: 'gestaoescolar-backend.vercel.app',
  port: 443,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Origin': 'https://nutriescola.vercel.app'
  }
};

console.log('🔐 Testando login...');
console.log('Email:', 'ewenunes0@gmail.com');
console.log('URL:', `https://${options.hostname}${options.path}`);
console.log('');

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  console.log('');

  let body = '';

  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    console.log('Resposta:');
    try {
      const json = JSON.parse(body);
      console.log(JSON.stringify(json, null, 2));
      
      if (json.success) {
        console.log('');
        console.log('✅ Login bem-sucedido!');
        console.log('Token:', json.data.token.substring(0, 50) + '...');
        console.log('Tipo:', json.data.tipo);
        console.log('Nome:', json.data.nome);
      } else {
        console.log('');
        console.log('❌ Login falhou');
      }
    } catch (e) {
      console.log(body);
      console.log('');
      console.log('❌ Erro ao parsear resposta:', e.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erro na requisição:', error.message);
});

req.write(data);
req.end();
