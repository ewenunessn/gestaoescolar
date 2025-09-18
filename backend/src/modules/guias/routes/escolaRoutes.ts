import express from 'express';
import { Request, Response } from 'express';

const router = express.Router();

// Rota básica para teste
router.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Rotas de escolas - API funcionando' });
});

// Rota de health check
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'escolas' });
});

export default router;