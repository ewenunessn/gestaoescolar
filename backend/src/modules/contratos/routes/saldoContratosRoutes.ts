import express from 'express';
import * as saldoContratosController from '../controllers/saldoContratosController';
import { devAuthMiddleware as authMiddleware } from '../../../middlewares';

const router = express.Router();

// Aplicar autenticação a todas as rotas (usando devAuthMiddleware para desenvolvimento)
router.use(authMiddleware);

/**
 * @route GET /api/saldos-contratos
 * @desc Lista todos os itens de contratos com seus saldos
 * @access Private
 * @query {
 *   page?: number,
 *   limit?: number,
 *   status?: 'DISPONIVEL' | 'BAIXO_ESTOQUE' | 'ESGOTADO',
 *   contrato_numero?: string,
 *   produto_nome?: string,
 *   fornecedor_id?: number
 * }
 */
router.get('/', saldoContratosController.listarTodosSaldos);

/**
 * @route GET /api/saldos-contratos/fornecedores
 * @desc Lista fornecedores disponíveis para filtro
 * @access Private
 */
router.get('/fornecedores', saldoContratosController.listarFornecedores);

/**
 * @route POST /api/saldos-contratos/:id/consumir
 * @desc Registra consumo de um produto do contrato
 * @access Private
 * @body {
 *   quantidade: number,
 *   observacao?: string,
 *   usuario_id: number
 * }
 */
router.post('/:id/consumir', saldoContratosController.registrarConsumo);

/**
 * @route GET /api/saldos-contratos/:id/historico-consumo
 * @desc Busca histórico de consumos de um produto do contrato
 * @access Private
 */
router.get('/:id/historico-consumo', saldoContratosController.buscarHistoricoConsumo);

/**
 * @route DELETE /api/saldos-contratos/consumo/:id
 * @desc Deleta um consumo registrado e estorna o saldo
 * @access Private
 * @body {
 *   usuario_id: number
 * }
 */
router.delete('/consumo/:id', saldoContratosController.deletarConsumo);

export default router;
