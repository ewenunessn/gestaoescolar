// Vercel serverless function - Load Express app with TypeScript support
require('tsx/cjs');
const app = require('../backend/src/index.ts');

module.exports = app;
