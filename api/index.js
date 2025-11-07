// Vercel serverless function - Load Express app with TypeScript support
// Quando root directory é 'backend', o caminho é './src/index.ts'
try {
  require('tsx/cjs');
  const app = require('../src/index.ts');
  module.exports = app.default || app;
} catch (error) {
  console.error('ERROR loading Express:', error);
  module.exports = (req, res) => {
    res.status(500).json({
      error: 'Failed to load Express app',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  };
}
