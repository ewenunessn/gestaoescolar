const crypto = require('crypto');

// Gera um JWT_SECRET seguro de 64 bytes em base64
const secret = crypto.randomBytes(64).toString('base64');

console.log('\n=== JWT_SECRET GERADO ===\n');
console.log(secret);
console.log('\n=== INSTRUÇÕES ===\n');
console.log('1. Copie o valor acima');
console.log('2. No Vercel, vá em Settings > Environment Variables');
console.log('3. Edite a variável JWT_SECRET');
console.log('4. Cole APENAS o valor gerado acima (sem espaços extras)');
console.log('5. Salve e faça redeploy\n');
