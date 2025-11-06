// Vercel serverless function entry point
import { VercelRequest, VercelResponse } from '@vercel/node';

// Import the Express app
let app: any;

try {
  app = require('../backend/src/index');
} catch (error) {
  console.error('Error loading Express app:', error);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', 'https://nutriescola.vercel.app');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Tenant-ID, X-Tenant-Subdomain, X-Tenant-Domain');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    // If app is not loaded, return error
    if (!app) {
      res.status(500).json({ 
        error: 'Backend not initialized',
        message: 'The Express app could not be loaded'
      });
      return;
    }
    
    // Pass request to Express app
    return app(req, res);
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}