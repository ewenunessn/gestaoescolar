import { Router } from 'express';
import EstoqueCentralController from '../controllers/EstoqueCentralController';

const router = Router();

// Listar estoque central
router.get('/', EstoqueCentralController.listar);

// Buscar estoque por produto
router.get('/produto/:produtoId', EstoqueCentralController.buscarPorProduto);

// Movimentações
router.post('/simular-saida', EstoqueCentralController.simularSaida);
router.post('/entrada', EstoqueCentralController.registrarEntrada);
router.post('/saida', EstoqueCentralController.registrarSaida);
router.post('/ajuste', EstoqueCentralController.registrarAjuste);

// Lotes
router.get('/:estoqueId/lotes', EstoqueCentralController.listarLotes);

// Alertas
router.get('/alertas/vencimento', EstoqueCentralController.listarLotesProximosVencimento);
router.get('/alertas/estoque-baixo', EstoqueCentralController.listarEstoqueBaixo);

// Histórico de movimentações
router.get('/movimentacoes', EstoqueCentralController.listarMovimentacoes);

export default router;
