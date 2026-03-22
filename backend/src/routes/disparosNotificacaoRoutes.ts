import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
  listarDisparos,
  criarDisparo,
  cancelarDisparo,
  processarAgendados,
} from '../controllers/disparosNotificacaoController';

const router = Router();
router.use(authenticateToken);

router.get('/', listarDisparos);
router.post('/', criarDisparo);
router.delete('/:id', cancelarDisparo);
// Endpoint interno para processar agendados (chamado por cron/job)
router.post('/processar-agendados', processarAgendados);

export default router;
