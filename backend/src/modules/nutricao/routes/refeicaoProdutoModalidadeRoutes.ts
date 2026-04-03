import { Router } from 'express';
import * as controller from '../controllers/refeicaoProdutoModalidadeController';
import { authenticateToken } from '../../../middleware/authMiddleware';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Listar ajustes de um produto da refeição
router.get('/refeicao-produto/:refeicaoProdutoId/ajustes', controller.listarAjustes);

// Salvar ajustes em lote
router.post('/refeicao-produto/:refeicaoProdutoId/ajustes', controller.salvarAjustes);

// Obter per capita efetivo para uma modalidade
router.get('/refeicao-produto/:refeicaoProdutoId/modalidade/:modalidadeId', controller.obterPerCapitaEfetivo);

// Listar produtos de uma refeição com todas as modalidades
router.get('/refeicao/:refeicaoId/produtos-modalidades', controller.listarProdutosComModalidades);

// Deletar um ajuste específico
router.delete('/ajuste/:id', controller.deletarAjuste);

export default router;
