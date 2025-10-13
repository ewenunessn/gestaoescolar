import { Router } from 'express';
import EntregaController from '../controllers/EntregaController';

const router = Router();

// Listar escolas com itens para entrega
router.get('/escolas', EntregaController.listarEscolas);

// Obter estatísticas gerais de entregas
router.get('/estatisticas', EntregaController.obterEstatisticas);

// Listar itens para entrega de uma escola específica
router.get('/escolas/:escolaId/itens', EntregaController.listarItensPorEscola);

// Buscar um item específico
router.get('/itens/:itemId', EntregaController.buscarItem);

// Confirmar entrega de um item
router.post('/itens/:itemId/confirmar', EntregaController.confirmarEntrega);

// Cancelar entrega de um item
router.post('/itens/:itemId/cancelar', EntregaController.cancelarEntrega);

export default router;