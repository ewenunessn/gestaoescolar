import { NextFunction, Request, Response, Router } from 'express';
import { authenticateToken } from '../../../middleware/authMiddleware';
import { requireEscrita, requireLeitura } from '../../../middleware/permissionMiddleware';
import * as ctrl from '../controllers/solicitacoesAlimentosController';

const router = Router();
const solicitacoesRead = requireLeitura('solicitacoes');
const solicitacoesWrite = requireEscrita('solicitacoes');

export function requireSolicitacoesRead(req: Request, res: Response, next: NextFunction) {
  return solicitacoesRead(req, res, next);
}

export function requireSolicitacoesWrite(req: Request, res: Response, next: NextFunction) {
  return solicitacoesWrite(req, res, next);
}

router.get('/minhas', authenticateToken, ctrl.listarMinhasSolicitacoes);
router.post('/', authenticateToken, ctrl.criarSolicitacao);
router.delete('/:id', authenticateToken, ctrl.cancelarSolicitacao);

router.get('/', authenticateToken, requireSolicitacoesRead, ctrl.listarTodasSolicitacoes);

router.get('/itens/:itemId/analise', authenticateToken, requireSolicitacoesRead, ctrl.analisarItem);
router.patch('/itens/:itemId/aprovar-emergencial', authenticateToken, requireSolicitacoesWrite, ctrl.aprovarItemEmergencial);
router.patch('/itens/:itemId/aceitar', authenticateToken, requireSolicitacoesWrite, ctrl.aceitarItem);
router.patch('/itens/:itemId/recusar', authenticateToken, requireSolicitacoesWrite, ctrl.recusarItem);

router.patch('/:id/aprovar-tudo', authenticateToken, requireSolicitacoesWrite, ctrl.aprovarTudo);

export default router;
