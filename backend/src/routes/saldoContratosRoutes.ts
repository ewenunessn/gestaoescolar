import express from 'express';
import * as saldoContratosController from '../controllers/saldoContratosController';
import { devAuthMiddleware } from '../middlewares/devAuthMiddleware';

const router = express.Router();

// Aplicar autenticação a todas as rotas (usando devAuthMiddleware para desenvolvimento)
router.use(devAuthMiddleware);

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

export default router;