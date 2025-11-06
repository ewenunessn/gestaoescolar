// Vercel serverless function entry point
import { VercelRequest, VercelResponse } from '@vercel/node';

// Import the Express app
const app = require('../backend/src/index');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}