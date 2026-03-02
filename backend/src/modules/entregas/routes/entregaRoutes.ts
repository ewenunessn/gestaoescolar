import { Router } from 'express';
import EntregaController from '../controllers/EntregaController';
import HistoricoEntregaController from '../controllers/HistoricoEntregaController';

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

// Rotas de histórico de entregas
router.get('/itens/:itemId/historico', HistoricoEntregaController.listarPorItem);
router.get('/escolas/:escolaId/historico', HistoricoEntregaController.listarPorEscola);
router.get('/itens/:itemId/completo', HistoricoEntregaController.buscarItemComHistorico);
router.get('/escolas/:escolaId/itens-completo', HistoricoEntregaController.listarItensComHistorico);
router.get('/itens/:itemId/saldo', HistoricoEntregaController.calcularSaldo);
router.delete('/historico/:id', HistoricoEntregaController.deletar);

export default router;