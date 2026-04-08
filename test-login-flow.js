const https = require('https');

async function testLogin() {
  console.log('🔐 Testando fluxo completo de login...\n');
  
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

      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          
          console.log('✅ Passo 1: Login');
          console.log('Status:', res.statusCode);
          console.log('Success:', response.success);
          console.log('');
          
          if (!response.success) {
            console.log('❌ Login falhou:', response);
            reject(new Error('Login falhou'));
            return;
          }

          const { token, tipo, nome, escola_id, tipo_secretaria, isSystemAdmin } = response.data;
          
          console.log('📋 Dados retornados:');
          console.log('- Token:', token ? 'Presente (' + token.length + ' chars)' : 'Ausente');
          console.log('- Tipo:', tipo);
          console.log('- Nome:', nome);
          console.log('- Escola ID:', escola_id);
          console.log('- Tipo Secretaria:', tipo_secretaria);
          console.log('- Is System Admin:', isSystemAdmin);
          console.log('');

          // Decodificar token JWT
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          
          console.log('🔍 Payload do Token:');
          console.log(JSON.stringify(payload, null, 2));
          console.log('');

          // Simular o que o frontend faz
          const userData = {
            id: payload.id,
            nome: nome,
            email: payload.email || 'ewenunes0@gmail.com',
            tipo: tipo,
            perfil: tipo,
            institution_id: payload.institution_id,
            escola_id: payload.escola_id || escola_id,
            tipo_secretaria: payload.tipo_secretaria || tipo_secretaria || 'educacao',
            isSystemAdmin: payload.isSystemAdmin || isSystemAdmin || false,
          };

          console.log('💾 Dados que seriam salvos no localStorage:');
          console.log(JSON.stringify(userData, null, 2));
          console.log('');

          const isEscolaUser = !!(userData.escola_id && userData.tipo !== 'admin' && !payload.isSystemAdmin);
          const redirectPath = isEscolaUser ? '/portal-escola' : '/dashboard';
          
          console.log('🔀 Redirecionamento:');
          console.log('- É usuário de escola?', isEscolaUser);
          console.log('- Caminho:', redirectPath);
          console.log('');

          console.log('✅ Fluxo completo OK!');
          resolve(userData);
        } catch (e) {
          console.error('❌ Erro ao processar resposta:', e.message);
          console.log('Body:', body);
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

testLogin().catch(console.error);
