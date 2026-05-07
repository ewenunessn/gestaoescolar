const jwt = require('jsonwebtoken');

// Token que foi gerado no login (copie do console do navegador)
const token = 'COLE_O_TOKEN_AQUI';

// Secrets para testar
const secrets = [
  'your_super_secret_jwt_key_change_this_in_production', // Local
  '<old-vercel-secret>', // Vercel antigo (errado)
  '<current-vercel-secret>', // Novo gerado
];

console.log('\n=== TESTANDO JWT_SECRET ===\n');

secrets.forEach((secret, index) => {
  console.log(`\nTeste ${index + 1}: ${secret.substring(0, 30)}...`);
  try {
    const decoded = jwt.verify(token, secret);
    console.log('✅ TOKEN VÁLIDO!');
    console.log('Dados:', decoded);
  } catch (error) {
    console.log('❌ TOKEN INVÁLIDO:', error.message);
  }
});

console.log('\n=== CONCLUSÃO ===');
console.log('O secret que validar o token é o que está sendo usado no backend.');
console.log('Se nenhum validar, o token pode estar corrompido ou expirado.\n');
