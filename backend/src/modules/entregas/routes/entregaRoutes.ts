import { Router } from 'express';
import EntregaController from '../controllers/EntregaController';
import HistoricoEntregaController from '../controllers/HistoricoEntregaController';
import ComprovanteEntregaController from '../controllers/ComprovanteEntregaController';
import { authenticateToken } from '../../../middleware/authMiddleware';
import { requireLeitura, requireEscrita } from '../../../middleware/permissionMiddleware';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas de LEITURA - Entregas
router.get('/escolas', requireLeitura('entregas'), EntregaController.listarEscolas);
router.get('/estatisticas', requireLeitura('entregas'), EntregaController.obterEstatisticas);
router.get('/escolas/:escolaId/itens', requireLeitura('entregas'), EntregaController.listarItensPorEscola);
router.get('/itens/:itemId', requireLeitura('entregas'), EntregaController.buscarItem);

// Rotas de LEITURA - Histórico
router.get('/itens/:itemId/historico', requireLeitura('entregas'), HistoricoEntregaController.listarPorItem);
router.get('/escolas/:escolaId/historico', requireLeitura('entregas'), HistoricoEntregaController.listarPorEscola);
router.get('/itens/:itemId/completo', requireLeitura('entregas'), HistoricoEntregaController.buscarItemComHistorico);
router.get('/escolas/:escolaId/itens-completo', requireLeitura('entregas'), HistoricoEntregaController.listarItensComHistorico);
router.get('/itens/:itemId/saldo', requireLeitura('entregas'), HistoricoEntregaController.calcularSaldo);

// Rotas de LEITURA - Comprovantes
router.get('/comprovantes', requireLeitura('entregas'), ComprovanteEntregaController.listar);
router.get('/comprovantes/:id', requireLeitura('entregas'), ComprovanteEntregaController.buscarPorId);
router.get('/comprovantes/numero/:numero', requireLeitura('entregas'), ComprovanteEntregaController.buscarPorNumero);
router.get('/comprovantes/escola/:escolaId', requireLeitura('entregas'), ComprovanteEntregaController.listarPorEscola);

// Rotas de ESCRITA - Entregas
router.post('/itens/:itemId/confirmar', requireEscrita('entregas'), EntregaController.confirmarEntrega);
router.post('/itens/:itemId/cancelar', requireEscrita('entregas'), EntregaController.cancelarEntrega);

// Rotas de ESCRITA - Histórico
router.delete('/historico/:id', requireEscrita('entregas'), HistoricoEntregaController.deletar);

// Rotas de ESCRITA - Comprovantes
router.post('/comprovantes', requireEscrita('entregas'), ComprovanteEntregaController.criar);
router.delete('/comprovantes/:id', requireEscrita('entregas'), ComprovanteEntregaController.cancelar);
router.delete('/comprovantes/:id/excluir', requireEscrita('entregas'), ComprovanteEntregaController.excluir);

export default router;
