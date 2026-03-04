import { Router } from 'express';
import * as recebimentoController from '../controllers/recebimentoController';
import { authenticateToken } from '../../../middleware/authMiddleware';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Listar pedidos pendentes e parciais
router.get('/pedidos-pendentes', recebimentoController.listarPedidosPendentes);

// Listar fornecedores de um pedido
router.get('/pedidos/:pedidoId/fornecedores', recebimentoController.listarFornecedoresPedido);

// Listar itens de um fornecedor em um pedido
router.get('/pedidos/:pedidoId/fornecedores/:fornecedorId/itens', recebimentoController.listarItensFornecedor);

// Registrar recebimento
router.post('/registrar', recebimentoController.registrarRecebimento);

// Listar recebimentos de um item
router.get('/itens/:pedidoItemId/recebimentos', recebimentoController.listarRecebimentosItem);

// Histórico de recebimentos de um pedido
router.get('/pedidos/:pedidoId/historico', recebimentoController.historicoRecebimentosPedido);

export default router;
