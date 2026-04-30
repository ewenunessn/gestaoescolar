import { NextFunction, Request, Response, Router } from 'express';
import { demandaController } from '../controllers/demandaController';
import { authenticateToken } from '../../../middleware/authMiddleware';
import { requireEscrita, requireLeitura } from '../../../middleware/permissionMiddleware';

const router = Router();
const guiasRead = requireLeitura('guias');
const guiasWrite = requireEscrita('guias');

export function requireGuiasRead(req: Request, res: Response, next: NextFunction) {
  return guiasRead(req, res, next);
}

export function requireGuiasWrite(req: Request, res: Response, next: NextFunction) {
  return guiasWrite(req, res, next);
}

// Rotas de demandas
router.get('/solicitantes', authenticateToken, requireGuiasRead, demandaController.listarSolicitantes);
router.get('/cardapios-disponiveis', authenticateToken, requireGuiasRead, demandaController.listarCardapiosDisponiveis);
router.post('/', authenticateToken, requireGuiasWrite, demandaController.criar);
router.get('/', authenticateToken, requireGuiasRead, demandaController.listar);
router.get('/:id', authenticateToken, requireGuiasRead, demandaController.buscarPorId);
router.put('/:id', authenticateToken, requireGuiasWrite, demandaController.atualizar);
router.delete('/:id', authenticateToken, requireGuiasWrite, demandaController.excluir);
router.patch('/:id/status', authenticateToken, requireGuiasWrite, demandaController.atualizarStatus);

export default router;
