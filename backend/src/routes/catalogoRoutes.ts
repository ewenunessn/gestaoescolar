import { Router } from "express";
import {
  listarCatalogoProdutos,
  buscarProdutoCatalogo,
  listarProdutosPorFornecedor,
  listarProdutosDisponiveis,
  obterEstatisticasCatalogo
} from "../controllers/catalogoController";
import { authMiddleware } from "../middlewares/authMiddleware";
import {
  validateCatalogoQuery,
  validateProdutoParams,
  validateFornecedorParams,
  sanitizeBusca,
  logCatalogoRequest
} from "../middlewares/catalogoValidation";

const router = Router();

// Aplicar middlewares globais
router.use(authMiddleware);
router.use(logCatalogoRequest);

/**
 * Rotas do catálogo de produtos
 */

// GET /api/produtos/catalogo - Lista produtos do catálogo com filtros e paginação
router.get("/", sanitizeBusca, validateCatalogoQuery, listarCatalogoProdutos);

// GET /api/produtos/catalogo/stats - Estatísticas do catálogo
router.get("/stats", obterEstatisticasCatalogo);

// GET /api/produtos/catalogo/disponiveis - Lista apenas produtos disponíveis
router.get("/disponiveis", sanitizeBusca, validateCatalogoQuery, listarProdutosDisponiveis);

// GET /api/produtos/catalogo/fornecedor/:fornecedor_id - Lista produtos de um fornecedor
router.get("/fornecedor/:fornecedor_id", validateFornecedorParams, listarProdutosPorFornecedor);

// GET /api/produtos/catalogo/:produto_id/:contrato_id - Detalhes de um produto específico
router.get("/:produto_id/:contrato_id", validateProdutoParams, buscarProdutoCatalogo);

export default router;