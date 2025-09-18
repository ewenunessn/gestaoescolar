import express from 'express';
import { Request, Response } from 'express';

const router = express.Router();

// Rota básica para teste
router.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Rotas de produtos - API funcionando' });
});

// Rota de health check
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'produtos' });
});

export default router;