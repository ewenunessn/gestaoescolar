import { NextFunction, Request, Response, Router } from 'express';
import { authenticateToken } from '../../../middleware/authMiddleware';
import { requireEscrita, requireLeitura } from '../../../middleware/permissionMiddleware';
import { listarDisparos, criarDisparo } from '../controllers/disparosNotificacaoController';

const router = Router();

const notificacoesRead = requireLeitura('notificacoes');
const notificacoesWrite = requireEscrita('notificacoes');

export function requireNotificacoesRead(req: Request, res: Response, next: NextFunction) {
  return notificacoesRead(req, res, next);
}

export function requireNotificacoesWrite(req: Request, res: Response, next: NextFunction) {
  return notificacoesWrite(req, res, next);
}

router.get('/', authenticateToken, requireNotificacoesRead, listarDisparos);
router.post('/', authenticateToken, requireNotificacoesWrite, criarDisparo);

export default router;
