import { Router } from 'express';
import { demandaController } from '../controllers/demandaController';

const router = Router();

// Rotas de demandas - SEM autenticação
router.get('/solicitantes', demandaController.listarSolicitantes);
router.post('/', demandaController.criar);
router.get('/', demandaController.listar);
router.get('/:id', demandaController.buscarPorId);
router.put('/:id', demandaController.atualizar);
router.delete('/:id', demandaController.excluir);
router.patch('/:id/status', demandaController.atualizarStatus);

export default router;
