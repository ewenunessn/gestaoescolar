import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import {
  buscarConsistenciaPedido,
  buscarConsistenciaGeral,
  buscarAuditoriaContrato,
  sincronizarDadosConsistencia,
  buscarDashboardConsistencia
  // buscarRelatorioDivergencias removida - módulo de relatórios descontinuado
} from '../controllers/consistenciaController';

const router = Router();

/**
 * @route GET /api/consistencia/pedido/:pedidoId
 * @desc Verifica a consistência de dados de um pedido específico
 * @access Private
 */
router.get('/pedido/:pedidoId', authMiddleware, buscarConsistenciaPedido);

/**
 * @route GET /api/consistencia/geral
 * @desc Verifica a consistência de todos os pedidos
 * @access Private
 */
router.get('/geral', authMiddleware, buscarConsistenciaGeral);

/**
 * @route GET /api/consistencia/contrato/:contratoId
 * @desc Auditoria completa de um contrato
 * @access Private
 */
router.get('/contrato/:contratoId', authMiddleware, buscarAuditoriaContrato);

/**
 * @route POST /api/consistencia/sincronizar
 * @desc Sincroniza dados entre módulos (todos os pedidos)
 * @access Private
 */
router.post('/sincronizar', authMiddleware, sincronizarDadosConsistencia);

/**
 * @route POST /api/consistencia/sincronizar/:pedidoId
 * @desc Sincroniza dados de um pedido específico
 * @access Private
 */
router.post('/sincronizar/:pedidoId', authMiddleware, sincronizarDadosConsistencia);

/**
 * @route GET /api/consistencia/dashboard
 * @desc Dashboard de consistência em tempo real
 * @access Private
 */
router.get('/dashboard', authMiddleware, buscarDashboardConsistencia);

// Rota relatorio-divergencias removida - módulo de relatórios descontinuado

export default router;