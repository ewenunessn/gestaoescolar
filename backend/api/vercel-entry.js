// Novo arquivo de entrada para forçar deploy limpo no Vercel
require('ts-node/register');

module.exports = async (req, res) => {
  try {
    // Configurar CORS headers IMEDIATAMENTE
    res.setHeader('Access-Control-Allow-Origin', 'https://nutriescola.vercel.app');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers, X-Tenant-ID, X-Tenant-Subdomain, X-Tenant-Domain');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, X-Foo, X-Bar');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    console.log('🚀 NOVO ENTRY POINT - CORS Configurado!');
    console.log('📋 Headers CORS aplicados:', {
      origin: 'https://nutriescola.vercel.app',
      methods: 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      headers: 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers, X-Tenant-ID, X-Tenant-Subdomain, X-Tenant-Domain'
    });
    
    // Responder a requisições OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
      console.log('✅ CORS: Respondendo preflight');
      res.status(200).end();
      return;
    }

    // Importar e executar o app principal
    const { default: app } = await import('../src/index.ts');
    return app(req, res);
    
  } catch (error) {
    console.error('❌ Erro no novo entry point:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};