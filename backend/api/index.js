// Arquivo de entrada para o Vercel
// Importa diretamente do TypeScript compilado pelo Vercel
const path = require('path');

// Função para executar migrações e inicializar o app
module.exports = async (req, res) => {
  try {
    // Importa dinamicamente o app compilado
    const { default: app } = await import('../src/index.js');
    
    // Executa o app
    return app(req, res);
  } catch (error) {
    console.error('❌ Erro ao inicializar aplicação:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};