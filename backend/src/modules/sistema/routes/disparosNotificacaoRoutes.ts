import { Router } from 'express';
import { authenticateToken } from '../../../middleware/authMiddleware';
import { listarDisparos, criarDisparo } from '../controllers/disparosNotificacaoController';

const router = Router();
router.use(authenticateToken);

router.get('/', listarDisparos);
router.post('/', criarDisparo);

export default router;
