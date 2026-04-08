// Vercel serverless function - Load Express app
module.exports = async (req, res) => {
  // Configurar CORS IMEDIATAMENTE antes de qualquer processamento
  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://nutriescola.vercel.app'
  ];
  
  const origin = req.headers.origin;
  
  // Se a origem está na lista permitida, adiciona os headers CORS
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  // Headers CORS para todos os requests
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Responder OPTIONS (preflight) imediatamente
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log('🚀 Inicializando aplicação no Vercel...');
    console.log('📊 Origin:', req.headers.origin);
    console.log('📊 Variáveis de ambiente:', {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      POSTGRES_URL: process.env.POSTGRES_URL ? '✅ Configurado' : '❌ Ausente',
      DATABASE_URL: process.env.DATABASE_URL ? '✅ Configurado' : '❌ Ausente'
    });

    // Importa o app compilado do dist
    const appModule = require('../dist/index.js');
    const app = appModule.default || appModule;

    // Executa o app (Express vai cuidar do CORS)
    return app(req, res);
  } catch (error) {
    console.error('❌ Erro ao inicializar aplicação:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
};
