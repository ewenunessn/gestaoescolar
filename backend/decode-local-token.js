const jwt = require('jsonwebtoken');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidGlwbyI6Imdlc3RvciIsImlhdCI6MTc2MDM4OTQyNCwiZXhwIjoxNzYwNDc1ODI0fQ.ffJXHG7B9jHrkuDAJ9asPL6O375ayItkVsnCf5gxww4';

// Decodificar sem verificar assinatura
const decoded = jwt.decode(token);
console.log('Token local decodificado:', decoded);

// Testar com o secret do .env local
const localSecret = 'sua_chave_jwt_super_secreta_minimo_32_caracteres';

try {
  const verified = jwt.verify(token, localSecret);
  console.log('✅ Token local verificado com sucesso usando secret do .env');
  console.log('Dados verificados:', verified);
} catch (error) {
  console.log('❌ Erro ao verificar token local:', error.message);
}