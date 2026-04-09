import { Router, Request, Response } from 'express';
import { config } from '../config/config';

const router = Router();

/**
 * Health check endpoint - verifica se o servidor está funcionando
 */
router.get('/health', (req: Request, res: Response) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    isVercel: config.isVercel,
    checks: {
      database: config.database.url ? 'configured' : 'not configured',
      jwtSecret: config.jwtSecret.startsWith('TEMPORARY-INSECURE-SECRET-') 
        ? '❌ NOT CONFIGURED - USING TEMPORARY SECRET' 
        : '✅ configured',
      cors: config.backend.cors.origin.length > 0 ? 'configured' : 'not configured'
    }
  };

  // Se JWT_SECRET não está configurado, retornar status 500
  if (config.jwtSecret.startsWith('TEMPORARY-INSECURE-SECRET-')) {
    return res.status(500).json({
      ...health,
      status: 'error',
      error: 'JWT_SECRET not configured - authentication will not work properly'
    });
  }

  res.json(health);
});

/**
 * Endpoint de debug - apenas para desenvolvimento
 * NUNCA exponha isso em produção com informações sensíveis
 */
router.get('/debug/config', (req: Request, res: Response) => {
  // Apenas permitir em desenvolvimento
  if (config.nodeEnv === 'production' && !req.query.secret) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const debugInfo = {
    environment: config.nodeEnv,
    isVercel: config.isVercel,
    isProduction: config.isProduction,
    port: config.port,
    jwtExpiresIn: config.jwtExpiresIn,
    checks: {
      jwtSecretConfigured: !config.jwtSecret.startsWith('TEMPORARY-INSECURE-SECRET-'),
      jwtSecretLength: config.jwtSecret.length,
      jwtSecretPrefix: config.jwtSecret.substring(0, 20) + '...',
      databaseConfigured: !!config.database.url,
      corsOrigins: config.backend.cors.origin
    }
  };

  res.json(debugInfo);
});

export default router;
