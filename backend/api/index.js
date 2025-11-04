// SOLUÇÃO MÍNIMA: Testar CORS básico primeiro
module.exports = (req, res) => {
  // Headers CORS básicos
  res.setHeader('Access-Control-Allow-Origin', 'https://nutriescola.vercel.app');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers, X-Tenant-ID, X-Tenant-Subdomain, X-Tenant-Domain, x-tenant-id, x-tenant-subdomain, x-tenant-domain');
  
  console.log('🔥 CORS aplicado em api/index.js!');
  
  // Responder preflight
  if (req.method === 'OPTIONS') {
    console.log('✅ Preflight CORS respondido');
    res.status(200).end();
    return;
  }
  
  // Rota de teste
  if (req.url === '/test') {
    res.json({ message: 'CORS funcionando!', timestamp: new Date().toISOString() });
    return;
  }
  
  // Resposta padrão para outras rotas
  res.status(200).json({ 
    message: 'API funcionando!',
    cors: 'ativado',
    headers: Object.keys(req.headers)
  });
};