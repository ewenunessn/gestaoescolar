// Arquivo de entrada para o Vercel
// Usa ts-node para executar TypeScript diretamente
require('ts-node/register');

// Função para executar migrações e inicializar o app
module.exports = async (req, res) => {
  try {
    // Configurar CORS headers ANTES de qualquer outra coisa
    const origin = req.headers.origin;
    console.log('🔍 CORS Check - Origin:', origin);
    
    // Permitir todos os domínios .vercel.app e localhost
    if (!origin || 
        origin.includes('.vercel.app') || 
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers, X-Tenant-ID, X-Tenant-Subdomain, X-Tenant-Domain');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, X-Foo, X-Bar');
      res.setHeader('Access-Control-Max-Age', '86400');
      console.log('✅ CORS: Headers configurados para', origin);
    }
    
    // Responder a requisições OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
      console.log('✅ CORS: Respondendo a preflight OPTIONS');
      res.status(200).end();
      return;
    }

    console.log('🚀 Inicializando aplicação no Vercel...');
    console.log('📊 Variáveis de ambiente:', {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      POSTGRES_URL: process.env.POSTGRES_URL ? '✅ Configurado' : '❌ Ausente',
      DATABASE_URL: process.env.DATABASE_URL ? '✅ Configurado' : '❌ Ausente'
    });

    // Importa diretamente do TypeScript
    const { default: app } = await import('../src/index.ts');
    
    // Executa o app
    return app(req, res);
  } catch (error) {
    console.error('❌ Erro ao inicializar aplicação:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      env_check: {
        NODE_ENV: process.env.NODE_ENV,
        POSTGRES_URL: process.env.POSTGRES_URL ? 'Presente' : 'Ausente',
        DATABASE_URL: process.env.DATABASE_URL ? 'Presente' : 'Ausente'
      }
    });
  }
};