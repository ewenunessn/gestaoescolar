// SOLUÇÃO DEFINITIVA: Headers CORS aplicados ANTES de qualquer coisa
const express = require('express');
const cors = require('cors');

// Criar app Express
const app = express();

// Configuração CORS explícita e completa
const corsOptions = {
  origin: 'https://nutriescola.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
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
  ]
};

// Aplicar CORS ANTES de tudo
app.use(cors(corsOptions));

// Middleware para garantir headers adicionais
app.use((req, res, next) => {
  console.log('🔥 CORS APLICADO DIRETAMENTE EM api/index.js!');
  console.log('📋 Headers configurados:', corsOptions);
  
  // Garantir que todos os headers estejam presentes
  res.setHeader('Access-Control-Allow-Origin', 'https://nutriescola.vercel.app');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  next();
});

// Rota de teste simples
app.get('/test', (req, res) => {
  res.json({ message: 'CORS funcionando!', headers: req.headers });
});

// Rota para verificar CORS
app.options('*', (req, res) => {
  console.log('✅ CORS: Preflight respondido com headers de tenant');
  res.status(200).end();
});

// Exportar handler para Vercel
module.exports = (req, res) => {
  return app(req, res);
};