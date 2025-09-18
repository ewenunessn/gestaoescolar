// Arquivo de entrada para o Vercel
// Importa diretamente do TypeScript compilado pelo Vercel
const path = require('path');

// Função para executar migrações e inicializar o app
module.exports = async (req, res) => {
  try {
    console.log('🚀 Inicializando aplicação no Vercel...');
    console.log('📊 Variáveis de ambiente:', {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      POSTGRES_URL: process.env.POSTGRES_URL ? '✅ Configurado' : '❌ Ausente',
      DATABASE_URL: process.env.DATABASE_URL ? '✅ Configurado' : '❌ Ausente'
    });

    // Importa dinamicamente o app compilado
    const { default: app } = await import('../dist/index.js');
    
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