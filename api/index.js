// Vercel serverless function v2 - Load Express app with TypeScript support
try {
  console.log('🔧 [VERCEL] Carregando aplicação Express...');
  require('tsx/cjs');
  const appModule = require('../backend/src/index.ts');
  
  // Suportar tanto export default quanto module.exports
  const app = appModule.default || appModule;
  
  // Verificar se app foi carregado corretamente
  if (!app || typeof app !== 'function') {
    console.error('❌ [VERCEL] App não é uma função válida:', typeof app);
    console.error('❌ [VERCEL] appModule:', Object.keys(appModule || {}));
    throw new Error('App não foi carregado corretamente');
  }
  
  console.log('✅ [VERCEL] Aplicação Express carregada com sucesso');
  module.exports = app;
} catch (error) {
  console.error('❌ [VERCEL] ERROR loading Express:', error);
  module.exports = (req, res) => {
    res.status(500).json({
      error: 'Failed to load Express app',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  };
}
