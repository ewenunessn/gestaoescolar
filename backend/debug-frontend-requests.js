/**
 * Debug das requisições do frontend para identificar problema de tenant
 */

const express = require('express');
const app = express();

// Middleware para interceptar e logar todas as requisições
app.use((req, res, next) => {
  if (req.path.includes('/api/')) {
    console.log('\n🔍 REQUISIÇÃO INTERCEPTADA:');
    console.log(`   Método: ${req.method}`);
    console.log(`   URL: ${req.path}`);
    console.log(`   Headers relevantes:`);
    console.log(`     Authorization: ${req.headers.authorization ? 'PRESENTE' : 'AUSENTE'}`);
    console.log(`     X-Tenant-ID: ${req.headers['x-tenant-id'] || 'AUSENTE'}`);
    console.log(`     X-Tenant-Subdomain: ${req.headers['x-tenant-subdomain'] || 'AUSENTE'}`);
    console.log(`     User-Agent: ${req.headers['user-agent'] || 'AUSENTE'}`);
    
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.replace('Bearer ', '');
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        console.log(`     Token Tenant: ${payload.tenantId || 'AUSENTE'}`);
        console.log(`     Token User: ${payload.userId || payload.id || 'AUSENTE'}`);
      } catch (error) {
        console.log(`     Token: INVÁLIDO (${error.message})`);
      }
    }
  }
  next();
});

console.log('🚀 Servidor de debug iniciado na porta 3001');
console.log('📡 Interceptando requisições para /api/*');
console.log('💡 Configure o frontend para usar http://localhost:3001 temporariamente');

app.listen(3001, () => {
  console.log('✅ Servidor rodando - aguardando requisições...');
});