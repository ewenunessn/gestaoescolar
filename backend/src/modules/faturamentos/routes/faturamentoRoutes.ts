import { Router } from 'express';
import * as faturamentoController from '../controllers/faturamentoController';
import { authenticateToken } from '../../../middleware/authMiddleware';
import { requireLeitura, requireEscrita } from '../../../middleware/permissionMiddleware';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas de LEITURA
router.get('/pedido/:pedidoId', requireLeitura('faturamentos'), faturamentoController.listarFaturamentosPedido);
router.get('/pedido/:pedidoId/resumo', requireLeitura('faturamentos'), faturamentoController.resumoFaturamentoPedido);
router.get('/:faturamentoId/relatorio-tipo-fornecedor', requireLeitura('faturamentos'), faturamentoController.relatorioTipoFornecedorModalidade);
router.get('/:id/resumo', requireLeitura('faturamentos'), faturamentoController.obterResumoFaturamento);
router.get('/:id', requireLeitura('faturamentos'), faturamentoController.buscarFaturamento);

// Rotas de ESCRITA
router.post('/', requireEscrita('faturamentos'), faturamentoController.criarFaturamento);
router.put('/:id', requireEscrita('faturamentos'), faturamentoController.atualizarFaturamento);
router.patch('/:id/status', requireEscrita('faturamentos'), faturamentoController.atualizarStatusFaturamento);
router.post('/:id/registrar-consumo', requireEscrita('faturamentos'), faturamentoController.registrarConsumoFaturamento);
router.post('/:id/itens/:itemId/registrar-consumo', requireEscrita('faturamentos'), faturamentoController.registrarConsumoItem);
router.post('/:id/itens/:itemId/reverter-consumo', requireEscrita('faturamentos'), faturamentoController.reverterConsumoItem);
router.delete('/:id/remover-modalidade', requireEscrita('faturamentos'), faturamentoController.removerItensModalidade);
router.delete('/:id', requireEscrita('faturamentos'), faturamentoController.deletarFaturamento);

export default router;
