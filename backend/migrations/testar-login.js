const axios = require('axios');

async function testarLogin() {
  try {
    console.log('🔐 Testando login...\n');
    
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'ewenunes0@gmail.com',
      senha: 'sua_senha_aqui' // SUBSTITUA PELA SENHA REAL
    });

    console.log('✅ Login bem-sucedido!\n');
    console.log('📦 Resposta completa:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.data?.token) {
      const token = response.data.data.token;
      console.log('\n🔍 Decodificando token...');
      
      // Decodificar token JWT
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(token);
      
      console.log('\n📊 Token decodificado:');
      console.log(JSON.stringify(decoded, null, 2));
      
      console.log('\n✅ Campos importantes:');
      console.log(`   escola_id: ${decoded.escola_id || 'NULL'}`);
      console.log(`   tipo_secretaria: ${decoded.tipo_secretaria || 'NULL'}`);
    }
    
  } catch (error) {
    if (error.response) {
      console.error('❌ Erro na resposta:', error.response.status);
      console.error('   Dados:', error.response.data);
    } else {
      console.error('❌ Erro:', error.message);
    }
  }
}

testarLogin();
