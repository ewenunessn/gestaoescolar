const jwt = require('jsonwebtoken');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidGlwbyI6Imdlc3RvciIsImlhdCI6MTc2MDM4OTIwMSwiZXhwIjoxNzYwNDc1NjAxfQ.ykGGldmOPfy0YmxJs7gtgoiXILP_yeauxnDad6wzTN0';

// Decodificar sem verificar assinatura
const decoded = jwt.decode(token);
console.log('Token decodificado:', decoded);

// Testar com diferentes secrets
const secrets = [
  'sua_chave_jwt_super_secreta_minimo_32_caracteres',
  'sua_chave_secreta_jwt_aqui_muito_segura_para_producao',
  process.env.JWT_SECRET
];

secrets.forEach((secret, index) => {
  if (!secret) return;
  
  try {
    const verified = jwt.verify(token, secret);
    console.log(`✅ Secret ${index + 1} funcionou:`, secret);
    console.log('Dados verificados:', verified);
  } catch (error) {
    console.log(`❌ Secret ${index + 1} falhou:`, secret);
    console.log('Erro:', error.message);
  }
});