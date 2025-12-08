const bcrypt = require('bcryptjs');

async function testBcrypt() {
  console.log('🔍 Testando bcrypt...\n');
  
  try {
    console.log('1️⃣ Gerando hash...');
    const start = Date.now();
    const hash = await bcrypt.hash('senha123', 10);
    const time = Date.now() - start;
    
    console.log('✅ Hash gerado com sucesso');
    console.log('   Tempo:', time, 'ms');
    console.log('   Hash:', hash.substring(0, 20) + '...');
    
    console.log('\n2️⃣ Verificando hash...');
    const isValid = await bcrypt.compare('senha123', hash);
    console.log('✅ Verificação:', isValid ? 'OK' : 'FALHOU');
    
  } catch (error) {
    console.error('❌ Erro no bcrypt:', error.message);
    console.error('   Stack:', error.stack);
  }
}

testBcrypt();
