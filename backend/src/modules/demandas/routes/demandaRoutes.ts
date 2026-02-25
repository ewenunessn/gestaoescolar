import { Router } from 'express';
import { demandaController } from '../controllers/demandaController';
import { authenticateToken } from '../../../middleware/authMiddleware';

const router = Router();

// Todas as rotas de demandas requerem autenticação
router.use(authenticateToken);

// Rotas de demandas
router.get('/solicitantes', demandaController.listarSolicitantes);
router.post('/', demandaController.criar);
router.get('/', demandaController.listar);
router.get('/:id', demandaController.buscarPorId);
router.put('/:id', demandaController.atualizar);
router.delete('/:id', demandaController.excluir);
router.patch('/:id/status', demandaController.atualizarStatus);

export default router;
