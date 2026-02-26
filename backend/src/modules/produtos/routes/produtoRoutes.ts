import { Router } from "express";
import { 
  listarProdutos, 
  buscarProduto, 
  criarProduto, 
  editarProduto, 
  removerProduto,
  buscarComposicaoNutricional,
  salvarComposicaoNutricional,
  standardizarComposicaoNutricional
} from "../controllers/produtoController";
import { authenticateToken } from "../../../middleware/authMiddleware";
const router = Router();

// Listar produtos
router.get("/", listarProdutos);

// Buscar produto por ID
router.get("/:id", buscarProduto);

// Buscar composição nutricional do produto
router.get("/:id/composicao-nutricional", buscarComposicaoNutricional);

// Salvar composição nutricional do produto
router.put("/:id/composicao-nutricional", salvarComposicaoNutricional);

// Padronizar esquema da composição nutricional (admin)
router.post("/standardize-composicao", authenticateToken, standardizarComposicaoNutricional);

// Criar novo produto
router.post("/", criarProduto);

// Editar produto
router.put("/:id", editarProduto);

// Remover produto
router.delete("/:id", removerProduto);

export default router;
