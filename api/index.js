// Vercel serverless function - Load Express app with TypeScript support
try {
  require('tsx/cjs');
  const app = require('../backend/src/index.ts');
  module.exports = app;
} catch (error) {
  console.error('Error loading Express app:', error);
  module.exports = (req, res) => {
    res.status(500).json({
      error: 'Failed to load Express app',
      message: error.message,
      stack: error.stack
    });
  };
}
