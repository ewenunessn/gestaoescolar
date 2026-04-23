// Teste para verificar qual JWT_SECRET o Vercel está usando
const axios = require('axios');

const BACKEND_URL = 'https://gestaoescolar-backend.vercel.app/api';

async function testJWTSecret() {
  console.log('\n=== TESTE DE JWT_SECRET NO VERCEL ===\n');
  
  try {
    // 1. Fazer login para obter um token
    console.log('1️⃣ Fazendo login...');
    const loginResponse = await axios.post(`${BACKEND_URL}/auth/login`, {
      email: 'ewenunes0@gmail.com',
      senha: '@Nunes8922'
    });
    
    const token = loginResponse.data.token || loginResponse.data.data?.token;
    console.log('✅ Login bem-sucedido');
    console.log('Resposta completa:', JSON.stringify(loginResponse.data, null, 2));
    
    if (!token) {
      console.log('❌ Token não encontrado na resposta!');
      return;
    }
    
    console.log('Token (primeiros 50 chars):', token.substring(0, 50));
    
    // 2. Tentar usar o token em outra requisição
    console.log('\n2️⃣ Testando token em /usuarios/me...');
    try {
      const meResponse = await axios.get(`${BACKEND_URL}/usuarios/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Token VÁLIDO! Usuário:', meResponse.data);
      console.log('\n🎉 JWT_SECRET está CORRETO no Vercel!');
    } catch (error) {
      console.log('❌ Token INVÁLIDO!');
      console.log('Status:', error.response?.status);
      console.log('Erro:', error.response?.data);
      console.log('\n⚠️ JWT_SECRET está INCORRETO no Vercel!');
      console.log('\n📋 AÇÃO NECESSÁRIA:');
      console.log('1. Vá em Vercel > Settings > Environment Variables');
      console.log('2. Edite JWT_SECRET');
      console.log('3. Cole: 0af3++BeU5woHy0VyjpNKgOHPPkUCDkmeIt0NhYhZVatE3t+xtkTIoEGLIrpKE5OSjKgfmO4FY2L3qRs/+KEBw==');
      console.log('4. IMPORTANTE: Marque todas as opções (Production, Preview, Development)');
      console.log('5. Salve e faça REDEPLOY');
    }
    
  } catch (error) {
    console.log('❌ Erro no login:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Dados:', error.response.data);
    }
  }
}

testJWTSecret();
