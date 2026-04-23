const https = require('https');

// Simular o fluxo completo do navegador
async function testCompleteFlow() {
  console.log('🔐 TESTE COMPLETO DO FLUXO DE LOGIN\n');
  console.log('='.repeat(60));
  
  // Passo 1: Login
  console.log('\n📍 PASSO 1: Fazer Login');
  console.log('-'.repeat(60));
  
  const loginData = JSON.stringify({
    email: 'ewenunes0@gmail.com',
    senha: '@Nunes8922'
  });

  const token = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'gestaoescolar-backend.vercel.app',
      port: 443,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length,
        'Origin': 'https://nutriescola.vercel.app'
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.success) {
            console.log('✅ Login bem-sucedido');
            console.log('   Token recebido:', response.data.token.substring(0, 50) + '...');
            resolve(response.data.token);
          } else {
            console.log('❌ Login falhou:', response);
            reject(new Error('Login falhou'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(loginData);
    req.end();
  });

  // Simular o que acontece no navegador após login
  console.log('\n📍 PASSO 2: Simular Navegação para /dashboard');
  console.log('-'.repeat(60));
  console.log('   (No navegador: navigate("/dashboard"))');
  
  // Passo 3: Requisições simultâneas que o Dashboard faz
  console.log('\n📍 PASSO 3: Requisições Simultâneas do Dashboard');
  console.log('-'.repeat(60));
  
  const endpoints = [
    { name: 'usuarios/me', path: '/api/usuarios/me', delay: 0 },
    { name: 'dashboard/stats', path: '/api/dashboard/stats', delay: 50 },
    { name: 'pnae/dashboard', path: '/api/pnae/dashboard', delay: 100 },
  ];

  // Fazer todas as requisições com pequenos delays (simulando o navegador)
  const results = await Promise.allSettled(
    endpoints.map(endpoint => 
      new Promise(resolve => {
        setTimeout(() => {
          testEndpointWithDetails(token, endpoint.path, endpoint.name)
            .then(resolve)
            .catch(resolve);
        }, endpoint.delay);
      })
    )
  );

  // Análise dos resultados
  console.log('\n📍 PASSO 4: Análise dos Resultados');
  console.log('-'.repeat(60));
  
  let hasError = false;
  results.forEach((result, index) => {
    const endpoint = endpoints[index];
    if (result.status === 'rejected' || (result.value && result.value.status === 401)) {
      hasError = true;
      console.log(`❌ ${endpoint.name}: FALHOU`);
    } else {
      console.log(`✅ ${endpoint.name}: OK`);
    }
  });

  console.log('\n' + '='.repeat(60));
  if (hasError) {
    console.log('❌ PROBLEMA ENCONTRADO: Algumas requisições falharam com 401');
    console.log('   Isso explica por que o usuário é deslogado após o login.');
  } else {
    console.log('✅ TODAS AS REQUISIÇÕES FUNCIONARAM');
    console.log('   O problema pode estar no frontend (localStorage, timing, etc)');
  }
  console.log('='.repeat(60));
}

function testEndpointWithDetails(token, path, name) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const req = https.request({
      hostname: 'gestaoescolar-backend.vercel.app',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Origin': 'https://nutriescola.vercel.app'
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        const duration = Date.now() - startTime;
        
        console.log(`\n   ${name}:`);
        console.log(`   - Status: ${res.statusCode}`);
        console.log(`   - Tempo: ${duration}ms`);
        
        if (res.statusCode === 401) {
          console.log(`   - ❌ ERRO 401: Token não aceito!`);
          try {
            const errorData = JSON.parse(body);
            console.log(`   - Mensagem:`, errorData.message || errorData);
          } catch (e) {
            console.log(`   - Resposta:`, body.substring(0, 100));
          }
        } else if (res.statusCode === 200) {
          console.log(`   - ✅ Sucesso`);
        } else {
          console.log(`   - ⚠️ Status inesperado`);
        }
        
        resolve({ status: res.statusCode, duration, name });
      });
    });

    req.on('error', (error) => {
      console.log(`\n   ${name}:`);
      console.log(`   - ❌ Erro na requisição: ${error.message}`);
      resolve({ status: 'error', error: error.message, name });
    });

    req.end();
  });
}

testCompleteFlow().catch(console.error);
