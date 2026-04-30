import { NextFunction, Request, Response, Router } from 'express';
import { buscarTaco } from '../controllers/tacoController';
import { authenticateToken } from '../../../middleware/authMiddleware';
import { requireLeitura } from '../../../middleware/permissionMiddleware';

const router = Router();
const produtosRead = requireLeitura('produtos');

export function requireProdutosRead(req: Request, res: Response, next: NextFunction) {
  return produtosRead(req, res, next);
}

router.get('/buscar', authenticateToken, requireProdutosRead, buscarTaco);

export default router;
