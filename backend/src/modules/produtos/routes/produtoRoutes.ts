import { Router } from "express";
import { 
  listarProdutos, 
  buscarProduto, 
  criarProduto, 
  editarProduto, 
  removerProduto,
  buscarComposicaoNutricional,
  salvarComposicaoNutricional
} from "../controllers/produtoController";
const router = Router();

// Listar produtos
router.get("/", listarProdutos);

// Buscar produto por ID
router.get("/:id", buscarProduto);

// Buscar composição nutricional do produto
router.get("/:id/composicao-nutricional", buscarComposicaoNutricional);

// Salvar composição nutricional do produto
router.put("/:id/composicao-nutricional", salvarComposicaoNutricional);

// Criar novo produto
router.post("/", criarProduto);

// Editar produto
router.put("/:id", editarProduto);

// Remover produto
router.delete("/:id", removerProduto);

export default router;