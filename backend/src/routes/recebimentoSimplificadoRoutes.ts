import { Router } from 'express';
import {
  initRecebimentoSimplificado,
  listarPedidosPendentes,
  listarPedidosRecebidos,
  listarItensRecebimento,
  receberItem,
  historicoItem,
  estatisticasPedido,
  inicializarControle,
  buscarRecebimento,
  confirmarRecebimento
} from '../controllers/recebimentoSimplificadoController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { devAuthMiddleware } from '../middlewares/devAuthMiddleware';

const router = Router();

// Aplicar middleware de autenticação em todas as rotas
// Em desenvolvimento, usar devAuthMiddleware para facilitar testes
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
router.use(isDevelopment ? devAuthMiddleware : authMiddleware);

/**
 * @route POST /api/recebimento-simples/init
 * @desc Inicializar sistema de recebimento simplificado
 * @access Private
 */
router.post('/init', initRecebimentoSimplificado);

/**
 * @route GET /api/recebimento-simples/pedidos-pendentes
 * @desc Listar pedidos com itens pendentes de recebimento
 * @access Private
 */
router.get('/pedidos-pendentes', listarPedidosPendentes);

/**
 * @route GET /api/recebimento-simples/pedidos-recebidos
 * @desc Listar pedidos que já foram recebidos (completos ou parciais)
 * @access Private
 */
router.get('/pedidos-recebidos', listarPedidosRecebidos);

/**
 * @route GET /api/recebimento-simples/pedido/:pedido_id/itens
 * @desc Listar itens de um pedido para recebimento
 * @access Private
 */
router.get('/pedido/:pedido_id/itens', listarItensRecebimento);

/**
 * @route POST /api/recebimento-simples/item/:pedido_item_id/receber
 * @desc Registrar recebimento de um item
 * @access Private
 */
router.post('/item/:pedido_item_id/receber', receberItem);

/**
 * @route GET /api/recebimento-simples/:id
 * @desc Buscar detalhes de recebimento de um pedido
 * @access Private
 */
router.get('/:id', buscarRecebimento);

/**
 * @route POST /api/recebimento-simples/confirmar
 * @desc Confirmar recebimento de pedido
 * @access Private
 */
router.post('/confirmar', confirmarRecebimento);

/**
 * @route GET /api/recebimento-simples/item/:pedido_item_id/historico
 * @desc Buscar histórico de recebimentos de um item
 * @access Private
 */
router.get('/item/:pedido_item_id/historico', historicoItem);

/**
 * @route GET /api/recebimento-simples/:id/estatisticas
 * @desc Buscar estatísticas de recebimento de um pedido
 * @access Private
 */
router.get('/:id/estatisticas', estatisticasPedido);

/**
 * @route POST /api/recebimento-simples/pedido/:pedido_id/inicializar
 * @desc Inicializar controle de itens para um pedido
 * @access Private
 */
router.post('/pedido/:pedido_id/inicializar', inicializarControle);

export default router;