import { NextFunction, Request, Response, Router } from 'express';
import { authenticateToken } from '../../../middleware/authMiddleware';
import { requireEscrita, requireLeitura } from '../../../middleware/permissionMiddleware';
import {
  calcularValoresNutricionais,
  calcularCusto,
  aplicarCalculosAutomaticos
} from '../controllers/refeicaoCalculosController';
import { buscarIngredientesDetalhados } from '../controllers/refeicaoIngredientesController';

const router = Router();
const refeicoesRead = requireLeitura('refeicoes');
const refeicoesWrite = requireEscrita('refeicoes');

export function requireRefeicoesRead(req: Request, res: Response, next: NextFunction) {
  return refeicoesRead(req, res, next);
}

export function requireRefeicoesWrite(req: Request, res: Response, next: NextFunction) {
  return refeicoesWrite(req, res, next);
}

router.post('/refeicoes/:id/calcular-nutricional', authenticateToken, requireRefeicoesRead, calcularValoresNutricionais);
router.post('/refeicoes/:id/calcular-custo', authenticateToken, requireRefeicoesRead, calcularCusto);
router.post('/refeicoes/:id/aplicar-calculos', authenticateToken, requireRefeicoesWrite, aplicarCalculosAutomaticos);
router.get('/refeicoes/:id/ingredientes-detalhados', authenticateToken, requireRefeicoesRead, buscarIngredientesDetalhados);

export default router;
