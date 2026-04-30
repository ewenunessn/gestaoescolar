import { NextFunction, Request, Response, Router } from 'express';
import { authenticateToken } from '../../../middleware/authMiddleware';
import { requireEscrita, requireLeitura } from '../../../middleware/permissionMiddleware';
import {
  listarGrupos,
  criarGrupo,
  atualizarGrupo,
  excluirGrupo,
  salvarItensGrupo,
} from '../controllers/gruposIngredientesController';

const router = Router();
const refeicoesRead = requireLeitura('refeicoes');
const refeicoesWrite = requireEscrita('refeicoes');

export function requireRefeicoesRead(req: Request, res: Response, next: NextFunction) {
  return refeicoesRead(req, res, next);
}

export function requireRefeicoesWrite(req: Request, res: Response, next: NextFunction) {
  return refeicoesWrite(req, res, next);
}

router.get('/', authenticateToken, requireRefeicoesRead, listarGrupos);
router.post('/', authenticateToken, requireRefeicoesWrite, criarGrupo);
router.put('/:id', authenticateToken, requireRefeicoesWrite, atualizarGrupo);
router.delete('/:id', authenticateToken, requireRefeicoesWrite, excluirGrupo);
router.put('/:id/itens', authenticateToken, requireRefeicoesWrite, salvarItensGrupo);

export default router;
