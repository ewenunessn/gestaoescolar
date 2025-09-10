const https = require('https');

const options = {
  hostname: 'gestaoescolar-backend.vercel.app',
  port: 443,
  path: '/api/estoque-consolidado/reset',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response Body:');
    console.log(data);
  });
});

req.on('error', (e) => {
  console.error(`Erro na requisição: ${e.message}`);
});

req.end();