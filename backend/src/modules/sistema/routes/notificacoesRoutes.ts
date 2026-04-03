import { Router } from 'express';
import { authenticateToken } from '../../../middleware/authMiddleware';
import { listarNotificacoes, marcarLida, marcarTodasLidas, deletarNotificacao } from '../controllers/notificacoesController';

const router = Router();
router.get('/', authenticateToken, listarNotificacoes);
router.patch('/:id/lida', authenticateToken, marcarLida);
router.patch('/todas-lidas', authenticateToken, marcarTodasLidas);
router.delete('/:id', authenticateToken, deletarNotificacao);
export default router;
