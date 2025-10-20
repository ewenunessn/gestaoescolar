import { Router } from 'express';
import { guiaController } from '../controllers/guiaController';
import { devAuthMiddleware as authenticateToken } from '../../../middlewares';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

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
