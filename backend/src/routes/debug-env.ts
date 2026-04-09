import { Router, Request, Response } from 'express';
import { config } from '../config/config';

const router = Router();

router.get('/debug-env', (req: Request, res: Response) => {
  const jwtSecretExists = !!process.env.JWT_SECRET;
  const jwtSecretLength = process.env.JWT_SECRET?.length || 0;
  const jwtSecretPreview = process.env.JWT_SECRET?.substring(0, 10) || 'AUSENTE';
  
  res.json({
    success: true,
    data: {
      JWT_SECRET_EXISTS: jwtSecretExists,
      JWT_SECRET_LENGTH: jwtSecretLength,
      JWT_SECRET_PREVIEW: jwtSecretPreview + '...',
      IS_TEMPORARY: jwtSecretPreview.includes('TEMPORARY'),
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      CONFIG_JWT_SECRET_PREVIEW: config.jwtSecret.substring(0, 10) + '...'
    }
  });
});

export default router;
