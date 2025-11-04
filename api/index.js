// ULTRA-MÍNIMO: Funciona com Vercel sem dependências
module.exports = (req, res) => {
  // Headers CORS - TODOS os headers de tenant
  res.setHeader('Access-Control-Allow-Origin', 'https://nutriescola.vercel.app');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers, X-Tenant-ID, X-Tenant-Subdomain, X-Tenant-Domain, x-tenant-id, x-tenant-subdomain, x-tenant-domain');
  
  console.log('🚀 CORS aplicado! Método:', req.method, 'URL:', req.url);
  
  // Responder preflight imediatamente
  if (req.method === 'OPTIONS') {
    console.log('✅ Preflight CORS respondido com headers de tenant');
    res.status(200).end();
    return;
  }
  
  // Teste simples
  if (req.url === '/test') {
    res.json({ 
      message: 'CORS funcionando!', 
      timestamp: new Date().toISOString(),
      tenantHeaders: ['x-tenant-id', 'x-tenant-subdomain', 'x-tenant-domain']
    });
    return;
  }
  
  // Resposta padrão
  res.status(200).json({ 
    message: 'API funcionando!',
    cors: 'ativado',
    method: req.method,
    url: req.url
  });
};