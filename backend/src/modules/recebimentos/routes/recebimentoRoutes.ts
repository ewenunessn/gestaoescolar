import { Router } from 'express';
import * as recebimentoController from '../controllers/recebimentoController';
import { authenticateToken } from '../../../middleware/authMiddleware';
import { requireLeitura, requireEscrita } from '../../../middleware/permissionMiddleware';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas de LEITURA
router.get('/pedidos-pendentes', requireLeitura('recebimentos'), recebimentoController.listarPedidosPendentes);
router.get('/pedidos-concluidos', requireLeitura('recebimentos'), recebimentoController.listarPedidosConcluidos);
router.get('/pedidos/:pedidoId/fornecedores', requireLeitura('recebimentos'), recebimentoController.listarFornecedoresPedido);
router.get('/pedidos/:pedidoId/fornecedores/:fornecedorId/itens', requireLeitura('recebimentos'), recebimentoController.listarItensFornecedor);
router.get('/itens/:pedidoItemId/recebimentos', requireLeitura('recebimentos'), recebimentoController.listarRecebimentosItem);
router.get('/pedidos/:pedidoId/historico', requireLeitura('recebimentos'), recebimentoController.historicoRecebimentosPedido);

// Rotas de ESCRITA
router.post('/registrar', requireEscrita('recebimentos'), recebimentoController.registrarRecebimento);

export default router;
