import { Router } from 'express';
import { guiaController } from '../controllers/guiaController';
// import { devAuthMiddleware as authenticateToken } from '../../../middlewares';
// import { tenantMiddleware } from '../../../middleware/tenantMiddleware';

const router = Router();

// TEMPORARIAMENTE SEM MIDDLEWARES PARA DEBUG
// router.use(authenticateToken);
// router.use(tenantMiddleware);

// Rota de teste
router.get('/test', (req, res) => {
  console.log('🧪 Rota de teste /guias/test chamada');
  res.json({ success: true, message: 'Rota de teste funcionando' });
});

// Rotas de guias
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

// Rota para listar todos os itens de uma guia
router.get('/:guiaId/itens', guiaController.listarItensGuia);

export default router;
