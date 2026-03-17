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
router.get('/:id', requireLeitura('faturamentos'), faturamentoController.buscarFaturamento);

// Rotas de ESCRITA
router.post('/', requireEscrita('faturamentos'), faturamentoController.criarFaturamento);
router.put('/:id', requireEscrita('faturamentos'), faturamentoController.atualizarFaturamento);
router.delete('/:id', requireEscrita('faturamentos'), faturamentoController.deletarFaturamento);

export default router;
