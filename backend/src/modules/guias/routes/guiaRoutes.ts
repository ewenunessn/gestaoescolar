import { Router } from 'express';
import { guiaController } from '../controllers/guiaController';
// import { devAuthMiddleware as authenticateToken } from '../../../middlewares';

const router = Router();

// TEMPORARIAMENTE SEM MIDDLEWARES PARA DEBUG
// router.use(authenticateToken);

// Rota de teste
router.get('/test', (req, res) => {
  console.log('🧪 Rota de teste /guias/test chamada');
  res.json({ success: true, message: 'Rota de teste funcionando' });
});

// Rotas de guias
router.get('/competencias', guiaController.listarCompetencias);
router.get('/status-escolas', guiaController.listarStatusEscolas);
router.get('/romaneio', guiaController.listarRomaneio);
router.get('/', guiaController.listarGuias);
router.post('/', guiaController.criarGuia);
router.get('/:id', guiaController.buscarGuia);
router.put('/:id', guiaController.atualizarGuia);
router.delete('/:id', guiaController.deletarGuia);

// Rotas de produtos dentro das guias
router.post('/:guiaId/produtos', guiaController.adicionarProdutoGuia);
router.get('/:guiaId/produtos', guiaController.listarProdutosGuia);
router.delete('/:guiaId/produtos/:produtoId/escolas/:escolaId', guiaController.removerProdutoGuia);

// Rota para atualizar dados de entrega
router.put('/:guiaId/produtos/:produtoId/escolas/:escolaId/entrega', guiaController.atualizarEntrega);

// Rota para atualizar campo para_entrega
router.put('/itens/:itemId/para-entrega', guiaController.atualizarParaEntrega);

// Rota para remover item pelo ID
router.delete('/itens/:itemId', guiaController.removerItemGuia);

// Rota para listar todos os itens de uma guia
router.get('/:guiaId/itens', guiaController.listarItensGuia);

// Novas rotas por escola
router.get('/escola/:escolaId/produtos', guiaController.listarProdutosPorEscola);
router.post('/escola/:escolaId/produtos', guiaController.adicionarProdutoEscola);
router.put('/escola/produtos/:itemId', guiaController.atualizarProdutoEscola);

export default router;
