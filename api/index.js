// Vercel serverless function v2 - Load Express app with TypeScript support
const path = require('path');
const fs = require('fs');

try {
  console.log('🔧 [VERCEL] Carregando aplicação Express...');
  console.log('🔧 [VERCEL] __dirname:', __dirname);
  console.log('🔧 [VERCEL] process.cwd():', process.cwd());
  
  // Detectar o caminho correto baseado no root directory
  let appPath;
  
  // Se root directory é 'backend', o caminho é './src/index.ts'
  if (fs.existsSync(path.join(__dirname, '../src/index.ts'))) {
    appPath = '../src/index.ts';
    console.log('✅ [VERCEL] Detectado root directory: backend');
  }
  // Se root directory é raiz, o caminho é '../backend/src/index.ts'
  else if (fs.existsSync(path.join(__dirname, '../backend/src/index.ts'))) {
    appPath = '../backend/src/index.ts';
    console.log('✅ [VERCEL] Detectado root directory: raiz');
  }
  else {
    throw new Error('Não foi possível encontrar backend/src/index.ts');
  }
  
  console.log('🔧 [VERCEL] Carregando de:', appPath);
  
  require('tsx/cjs');
  const appModule = require(appPath);
  
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
  console.error('❌ [VERCEL] Stack:', error.stack);
  module.exports = (req, res) => {
    res.status(500).json({
      error: 'Failed to load Express app',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      cwd: process.cwd(),
      dirname: __dirname
    });
  };
}
