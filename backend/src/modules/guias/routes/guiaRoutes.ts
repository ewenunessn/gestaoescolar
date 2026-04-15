import { Router } from 'express';
import { guiaController } from '../controllers/guiaController';
import { authenticateToken } from '../../../middleware/authMiddleware';
import { requireLeitura, requireEscrita } from '../../../middleware/permissionMiddleware';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rota de teste
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Rota de teste funcionando' });
});

// Rotas de guias - LEITURA
router.get('/competencias', requireLeitura('guias'), guiaController.listarCompetencias);
router.get('/status-escolas', requireLeitura('guias'), guiaController.listarStatusEscolas);
router.get('/romaneio', requireLeitura('guias'), guiaController.listarRomaneio);
router.get('/', requireLeitura('guias'), guiaController.listarGuias);
router.get('/:id', requireLeitura('guias'), guiaController.buscarGuia);
router.get('/:guiaId/produtos', requireLeitura('guias'), guiaController.listarProdutosGuia);
router.get('/:guiaId/itens', requireLeitura('guias'), guiaController.listarItensGuia);
router.get('/escola/:escolaId/produtos', requireLeitura('guias'), guiaController.listarProdutosPorEscola);
router.get('/:guiaId/ajuste', requireLeitura('guias'), guiaController.listarItensParaAjuste);

// Rotas de guias - ESCRITA
router.post('/', requireEscrita('guias'), guiaController.criarGuia);
router.put('/:id', requireEscrita('guias'), guiaController.atualizarGuia);
router.delete('/:id', requireEscrita('guias'), guiaController.deletarGuia);
router.post('/:guiaId/produtos', requireEscrita('guias'), guiaController.adicionarProdutoGuia);
router.delete('/:guiaId/produtos/:produtoId/escolas/:escolaId', requireEscrita('guias'), guiaController.removerProdutoGuia);
router.put('/:guiaId/produtos/:produtoId/escolas/:escolaId/entrega', requireEscrita('guias'), guiaController.atualizarEntrega);
router.put('/itens/:itemId/para-entrega', requireEscrita('guias'), guiaController.atualizarParaEntrega);
router.delete('/itens/:itemId', requireEscrita('guias'), guiaController.removerItemGuia);
router.post('/escola/:escolaId/produtos', requireEscrita('guias'), guiaController.adicionarProdutoEscola);
router.put('/escola/produtos/:itemId', requireEscrita('guias'), guiaController.atualizarProdutoEscola);
router.put('/:guiaId/ajuste', requireEscrita('guias'), guiaController.salvarAjuste);

export default router;
