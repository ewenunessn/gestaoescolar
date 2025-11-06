import { VercelRequest, VercelResponse } from '@vercel/node';

// Import Express app
const app = require('../backend/src/index');

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}