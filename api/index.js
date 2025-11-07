// Vercel serverless function v2 - Load Express app with TypeScript support
const path = require('path');
const fs = require('fs');

try {
  console.log('🔧 [VERCEL] Carregando aplicação Express...');
  console.log('🔧 [VERCEL] __dirname:', __dirname);
  console.log('🔧 [VERCEL] process.cwd():', process.cwd());
  
  // Listar arquivos para debug
  try {
    const parentDir = path.join(__dirname, '..');
    console.log('🔧 [VERCEL] Conteúdo de ..:', fs.readdirSync(parentDir));
  } catch (e) {
    console.log('⚠️ [VERCEL] Não foi possível listar diretório pai');
  }
  
  // Detectar o caminho correto baseado no root directory
  let appPath;
  let fullPath;
  
  // Opção 1: Se root directory é 'backend', o caminho é './src/index.ts'
  fullPath = path.join(__dirname, '../src/index.ts');
  if (fs.existsSync(fullPath)) {
    appPath = '../src/index.ts';
    console.log('✅ [VERCEL] Detectado root directory: backend');
    console.log('✅ [VERCEL] Arquivo encontrado em:', fullPath);
  }
  // Opção 2: Se root directory é raiz, o caminho é '../backend/src/index.ts'
  else {
    fullPath = path.join(__dirname, '../backend/src/index.ts');
    if (fs.existsSync(fullPath)) {
      appPath = '../backend/src/index.ts';
      console.log('✅ [VERCEL] Detectado root directory: raiz');
      console.log('✅ [VERCEL] Arquivo encontrado em:', fullPath);
    }
    else {
      console.error('❌ [VERCEL] Arquivo não encontrado em nenhum dos caminhos:');
      console.error('   -', path.join(__dirname, '../src/index.ts'));
      console.error('   -', path.join(__dirname, '../backend/src/index.ts'));
      throw new Error('Não foi possível encontrar backend/src/index.ts');
    }
  }
  
  console.log('🔧 [VERCEL] Carregando de:', appPath);
  
  // Carregar tsx
  console.log('🔧 [VERCEL] Carregando tsx...');
  require('tsx/cjs');
  console.log('✅ [VERCEL] tsx carregado');
  
  // Carregar aplicação
  console.log('🔧 [VERCEL] Carregando aplicação Express...');
  const appModule = require(appPath);
  console.log('✅ [VERCEL] Módulo carregado');
  console.log('🔧 [VERCEL] Tipo do módulo:', typeof appModule);
  console.log('🔧 [VERCEL] Keys do módulo:', Object.keys(appModule || {}));
  
  // Suportar tanto export default quanto module.exports
  const app = appModule.default || appModule;
  
  // Verificar se app foi carregado corretamente
  if (!app || typeof app !== 'function') {
    console.error('❌ [VERCEL] App não é uma função válida:', typeof app);
    console.error('❌ [VERCEL] appModule:', appModule);
    throw new Error('App não foi carregado corretamente - não é uma função');
  }
  
  console.log('✅ [VERCEL] Aplicação Express carregada com sucesso');
  module.exports = app;
} catch (error) {
  console.error('❌ [VERCEL] ERROR loading Express:', error.message);
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
