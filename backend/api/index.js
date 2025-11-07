// Vercel serverless function - Load Express app
module.exports = async (req, res) => {
  try {
    console.log('🚀 Inicializando aplicação no Vercel...');
    console.log('📊 Origin:', req.headers.origin);
    console.log('📊 Variáveis de ambiente:', {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      POSTGRES_URL: process.env.POSTGRES_URL ? '✅ Configurado' : '❌ Ausente',
      DATABASE_URL: process.env.DATABASE_URL ? '✅ Configurado' : '❌ Ausente'
    });

    // Importa dinamicamente o app com TypeScript support
    require('tsx/cjs');
    const appModule = require('../src/index.ts');
    const app = appModule.default || appModule;

    // Executa o app (Express vai cuidar do CORS)
    return app(req, res);
  } catch (error) {
    console.error('❌ Erro ao inicializar aplicação:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};
