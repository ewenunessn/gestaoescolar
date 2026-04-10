const http = require('http');

const data = JSON.stringify({
  rendimento_porcoes: 1
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/refeicoes/31/calcular-valores-nutricionais',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(body);
      console.log('📊 Resultado do cálculo nutricional:');
      console.log(JSON.stringify(result, null, 2));
    } catch (e) {
      console.log('Raw response:', body);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erro:', error.message);
});

req.write(data);
req.end();
