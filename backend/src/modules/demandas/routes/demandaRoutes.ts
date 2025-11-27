import { Router } from 'express';
import { demandaController } from '../controllers/demandaController';
import { authenticateToken } from '../../../middleware/authMiddleware';
import { tenantMiddleware } from '../../../middleware/tenantMiddleware';

const router = Router();

// Todas as rotas de demandas requerem autenticação
router.use(authenticateToken);
// TEMPORARIAMENTE DESABILITADO - tenantMiddleware está causando timeout
// router.use(tenantMiddleware);

// Rotas de demandas
router.get('/solicitantes', demandaController.listarSolicitantes);
router.post('/', demandaController.criar);
router.get('/', demandaController.listar);
router.get('/:id', demandaController.buscarPorId);
router.put('/:id', demandaController.atualizar);
router.delete('/:id', demandaController.excluir);
router.patch('/:id/status', demandaController.atualizarStatus);

export default router;
