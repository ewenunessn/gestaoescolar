const jwt = require('jsonwebtoken');

// Cole o token JWT aqui (pegue do localStorage do navegador)
const token = process.argv[2];

if (!token) {
  console.log('❌ Uso: node decodificar-token.js <TOKEN>');
  console.log('\n📋 Para pegar o token:');
  console.log('   1. Abra o DevTools (F12)');
  console.log('   2. Vá em Application > Local Storage');
  console.log('   3. Procure por "token" ou "authToken"');
  console.log('   4. Copie o valor e execute: node backend/migrations/decodificar-token.js "SEU_TOKEN"');
  process.exit(1);
}

try {
  // Decodificar sem verificar assinatura (apenas para debug)
  const decoded = jwt.decode(token);
  
  console.log('🔍 Token decodificado:\n');
  console.log(JSON.stringify(decoded, null, 2));
  
  console.log('\n📊 Campos importantes:');
  console.log(`   ID: ${decoded.id}`);
  console.log(`   Nome: ${decoded.nome}`);
  console.log(`   Email: ${decoded.email}`);
  console.log(`   Tipo: ${decoded.tipo}`);
  console.log(`   Escola ID: ${decoded.escola_id || 'NULL'}`);
  console.log(`   Tipo Secretaria: ${decoded.tipo_secretaria || 'NULL'}`);
  console.log(`   Is System Admin: ${decoded.isSystemAdmin}`);
  
  // Verificar expiração
  if (decoded.exp) {
    const expDate = new Date(decoded.exp * 1000);
    const now = new Date();
    const isExpired = expDate < now;
    
    console.log(`\n⏰ Expiração:`);
    console.log(`   Data: ${expDate.toLocaleString()}`);
    console.log(`   Status: ${isExpired ? '❌ EXPIRADO' : '✅ VÁLIDO'}`);
  }
  
} catch (error) {
  console.error('❌ Erro ao decodificar token:', error.message);
}
