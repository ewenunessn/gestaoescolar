// Vercel serverless function v2 - Load Express app with TypeScript support
try {
  require('tsx/cjs');
  const app = require('../backend/src/index.ts');
  module.exports = app;
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
