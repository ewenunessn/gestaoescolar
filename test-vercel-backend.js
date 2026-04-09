// Script para testar o backend no Vercel e diagnosticar problemas
// Execute: node test-vercel-backend.js

const https = require('https');

const BACKEND_URL = 'https://gestaoescolar-backend.vercel.app';

// Função auxiliar para fazer requisições HTTPS
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
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

async function runTests() {
  console.log('\n🔍 DIAGNÓSTICO DO BACKEND NO VERCEL\n');
  console.log('=' .repeat(70));
  console.log(`Backend URL: ${BACKEND_URL}\n`);

  // Teste 1: Health Check
  console.log('📋 Teste 1: Health Check');
  console.log('-'.repeat(70));
  try {
    const health = await makeRequest(`${BACKEND_URL}/health`);
    console.log(`Status: ${health.status}`);
    console.log('Resposta:', JSON.stringify(health.body, null, 2));
    
    if (health.body.checks?.jwtSecret?.includes('NOT CONFIGURED')) {
      console.log('\n❌ PROBLEMA CRÍTICO DETECTADO:');
      console.log('   JWT_SECRET não está configurado no Vercel!');
      console.log('   Isso explica o erro 401 - tokens são inválidos a cada restart.');
      console.log('\n   SOLUÇÃO:');
      console.log('   1. Acesse: https://vercel.com/dashboard');
      console.log('   2. Selecione: gestaoescolar-backend');
      console.log('   3. Vá em: Settings → Environment Variables');
      console.log('   4. Adicione: JWT_SECRET com um valor fixo e seguro');
      console.log('   5. Faça redeploy');
    } else {
      console.log('\n✅ JWT_SECRET está configurado corretamente');
    }
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
  }

  // Teste 2: Login
  console.log('\n\n📋 Teste 2: Login');
  console.log('-'.repeat(70));
  console.log('Tentando fazer login...');
  
  try {
    const loginResponse = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        email: 'ewenunes0@gmail.com',
        senha: '@Nunes8922'
      }
    });
    
    console.log(`Status: ${loginResponse.status}`);
    
    if (loginResponse.status === 200) {
      console.log('✅ Login bem-sucedido!');
      const token = loginResponse.body.data?.token || loginResponse.body.token;
      
      if (token) {
        console.log(`Token recebido: ${token.substring(0, 50)}...`);
        
        // Decodificar token
        const [headerB64, payloadB64] = token.split('.');
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
        
        console.log('\n📦 Payload do token:');
        console.log(JSON.stringify(payload, null, 2));
        
        const now = Date.now() / 1000;
        const expiresIn = payload.exp - now;
        const hoursLeft = Math.floor(expiresIn / 3600);
        
        console.log(`\n⏰ Token expira em: ${hoursLeft} horas`);
        
        // Teste 3: Usar o token para acessar endpoint protegido
        console.log('\n\n📋 Teste 3: Acessar endpoint protegido');
        console.log('-'.repeat(70));
        
        try {
          const protectedResponse = await makeRequest(`${BACKEND_URL}/api/dashboard/stats`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log(`Status: ${protectedResponse.status}`);
          
          if (protectedResponse.status === 200) {
            console.log('✅ Token aceito! Endpoint protegido acessível.');
            console.log('Resposta:', JSON.stringify(protectedResponse.body, null, 2));
          } else if (protectedResponse.status === 401) {
            console.log('❌ Token rejeitado com 401!');
            console.log('Resposta:', JSON.stringify(protectedResponse.body, null, 2));
            console.log('\n🔍 POSSÍVEIS CAUSAS:');
            console.log('   1. JWT_SECRET mudou entre o login e esta requisição');
            console.log('   2. Backend reiniciou e gerou novo JWT_SECRET');
            console.log('   3. JWT_SECRET não está configurado no Vercel');
          } else {
            console.log(`⚠️  Status inesperado: ${protectedResponse.status}`);
            console.log('Resposta:', JSON.stringify(protectedResponse.body, null, 2));
          }
        } catch (error) {
          console.log(`❌ Erro ao acessar endpoint protegido: ${error.message}`);
        }
        
        // Teste 4: Aguardar e testar novamente (simular restart)
        console.log('\n\n📋 Teste 4: Testar token após 5 segundos');
        console.log('-'.repeat(70));
        console.log('Aguardando 5 segundos para simular possível restart...');
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        try {
          const retryResponse = await makeRequest(`${BACKEND_URL}/api/dashboard/stats`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log(`Status: ${retryResponse.status}`);
          
          if (retryResponse.status === 200) {
            console.log('✅ Token ainda válido após 5 segundos!');
          } else if (retryResponse.status === 401) {
            console.log('❌ Token inválido após 5 segundos!');
            console.log('   Isso confirma que o JWT_SECRET está mudando.');
          }
        } catch (error) {
          console.log(`❌ Erro: ${error.message}`);
        }
        
      } else {
        console.log('❌ Token não encontrado na resposta');
      }
    } else {
      console.log(`❌ Login falhou com status ${loginResponse.status}`);
      console.log('Resposta:', JSON.stringify(loginResponse.body, null, 2));
    }
  } catch (error) {
    console.log(`❌ Erro no login: ${error.message}`);
  }

  console.log('\n' + '=' .repeat(70));
  console.log('\n📊 RESUMO DO DIAGNÓSTICO\n');
  console.log('Se você viu "JWT_SECRET NOT CONFIGURED", siga estes passos:');
  console.log('1. Configure JWT_SECRET no Vercel');
  console.log('2. Use um valor FIXO (não dinâmico)');
  console.log('3. Faça redeploy do backend');
  console.log('4. Execute este script novamente para confirmar');
  console.log('\nVeja SOLUCAO-PROBLEMA-401.md para instruções detalhadas.\n');
}

runTests().catch(console.error);
