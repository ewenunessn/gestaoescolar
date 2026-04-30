import { NextFunction, Request, Response, Router } from 'express';
import { authenticateToken } from '../../../middleware/authMiddleware';
import { requireLeitura } from '../../../middleware/permissionMiddleware';
import * as controller from '../controllers/unidadeMedidaController';

const router = Router();
const produtosRead = requireLeitura('produtos');

export function requireProdutosRead(req: Request, res: Response, next: NextFunction) {
  return produtosRead(req, res, next);
}

router.get('/', authenticateToken, requireProdutosRead, controller.listarUnidades);
router.post('/converter', authenticateToken, requireProdutosRead, controller.converterUnidades);
router.post('/calcular-fator', authenticateToken, requireProdutosRead, controller.calcularFator);
router.get('/:identificador', authenticateToken, requireProdutosRead, controller.buscarUnidade);

export default router;
