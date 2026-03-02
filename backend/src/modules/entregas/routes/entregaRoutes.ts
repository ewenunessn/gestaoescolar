import { Router } from 'express';
import EntregaController from '../controllers/EntregaController';
import HistoricoEntregaController from '../controllers/HistoricoEntregaController';
import ComprovanteEntregaController from '../controllers/ComprovanteEntregaController';

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

// Rotas de comprovantes de entrega
router.post('/comprovantes', ComprovanteEntregaController.criar);
router.get('/comprovantes', ComprovanteEntregaController.listar);
router.get('/comprovantes/:id', ComprovanteEntregaController.buscarPorId);
router.get('/comprovantes/numero/:numero', ComprovanteEntregaController.buscarPorNumero);
router.get('/comprovantes/escola/:escolaId', ComprovanteEntregaController.listarPorEscola);
router.delete('/comprovantes/:id', ComprovanteEntregaController.cancelar);

export default router;