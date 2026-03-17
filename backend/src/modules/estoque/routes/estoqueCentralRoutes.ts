import { Router } from 'express';
import EstoqueCentralController from '../controllers/EstoqueCentralController';
import { authenticateToken } from '../../../middleware/authMiddleware';
import { requireLeitura, requireEscrita } from '../../../middleware/permissionMiddleware';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas de LEITURA
router.get('/', requireLeitura('estoque'), EstoqueCentralController.listar);
router.get('/produto/:produtoId', requireLeitura('estoque'), EstoqueCentralController.buscarPorProduto);
router.get('/:estoqueId/lotes', requireLeitura('estoque'), EstoqueCentralController.listarLotes);
router.get('/alertas/vencimento', requireLeitura('estoque'), EstoqueCentralController.listarLotesProximosVencimento);
router.get('/alertas/estoque-baixo', requireLeitura('estoque'), EstoqueCentralController.listarEstoqueBaixo);
router.get('/movimentacoes', requireLeitura('estoque'), EstoqueCentralController.listarMovimentacoes);

// Rotas de ESCRITA
router.post('/simular-saida', requireEscrita('estoque'), EstoqueCentralController.simularSaida);
router.post('/entrada', requireEscrita('estoque'), EstoqueCentralController.registrarEntrada);
router.post('/saida', requireEscrita('estoque'), EstoqueCentralController.registrarSaida);
router.post('/ajuste', requireEscrita('estoque'), EstoqueCentralController.registrarAjuste);

export default router;
