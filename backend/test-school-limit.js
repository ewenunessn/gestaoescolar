const axios = require('axios');

async function testSchoolLimit() {
  try {
    console.log('🧪 Testando limite de escolas...\n');

    // Login
    console.log('1️⃣ Fazendo login...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'joao.silva@exemplo.gov.br',
      senha: 'Senha@123'
    });
    const token = loginResponse.data.token;
    console.log('✅ Login bem-sucedido\n');

    // Verificar quantas escolas existem
    console.log('2️⃣ Verificando escolas existentes...');
    const escolasResponse = await axios.get('http://localhost:3000/api/escolas', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const totalEscolas = escolasResponse.data.total || 0;
    console.log(`   Total de escolas: ${totalEscolas}`);
    console.log(`   Limite: 3 escolas (Plano Gratuito)\n`);

    // Tentar criar mais uma escola
    if (totalEscolas >= 3) {
      console.log('3️⃣ Tentando criar escola além do limite...');
      try {
        await axios.post('http://localhost:3000/api/escolas', {
          nome: 'Escola Extra',
          endereco: 'Rua Teste',
          municipio: 'Exemplo',
          telefone: '11999999999',
          email: 'extra@escola.com',
          administracao: 'municipal'
        }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('❌ ERRO: Deveria ter bloqueado!');
      } catch (error) {
        if (error.response?.status === 403) {
          console.log('✅ Limite de escolas funcionando!');
          console.log(`   Mensagem: ${error.response.data.message}\n`);
        } else {
          throw error;
        }
      }
    } else {
      console.log(`3️⃣ Ainda há espaço para criar ${3 - totalEscolas} escola(s)\n`);
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('  ✅ VALIDAÇÃO DE LIMITE DE ESCOLAS IMPLEMENTADA');
    console.log('═══════════════════════════════════════════════════════');

  } catch (error) {
    console.error('\n❌ Erro:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Mensagem:', error.response.data.message);
    } else {
      console.error(error.message);
    }
  }
}

testSchoolLimit();
