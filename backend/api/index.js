// SOLUÇÃO DEFINITIVA: Headers CORS aplicados ANTES de qualquer coisa
require('ts-node/register');

const originalApp = require('../src/index.ts');

module.exports = (req, res) => {
  // 🚀 APLICAR HEADERS CORS IMEDIATAMENTE - ANTES DE TUDO
  const allowedHeaders = [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin', 
    'Access-Control-Request-Method', 
    'Access-Control-Request-Headers',
    'X-Tenant-ID',
    'X-Tenant-Subdomain', 
    'X-Tenant-Domain',
    'x-tenant-id',
    'x-tenant-subdomain',
    'x-tenant-domain'
  ].join(', ');

  // Headers CORS obrigatórios
  res.setHeader('Access-Control-Allow-Origin', 'https://nutriescola.vercel.app');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', allowedHeaders);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  console.log('🔥 CORS APLICADO DIRETAMENTE EM api/index.js!');
  console.log('📋 Headers configurados:', {
    origin: 'https://nutriescola.vercel.app',
    methods: 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    headers: allowedHeaders
  });
  
  // Responder preflight imediatamente
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS: Preflight respondido com headers de tenant');
    res.status(200).end();
    return;
  }

  // Executar aplicação principal
  return originalApp(req, res);
};