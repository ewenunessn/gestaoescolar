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
import { requireLeitura, requireEscrita } from "../../../middleware/permissionMiddleware";

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas de LEITURA
router.get("/", requireLeitura('produtos'), listarProdutos);
router.get("/:id", requireLeitura('produtos'), buscarProduto);
router.get("/:id/composicao-nutricional", requireLeitura('produtos'), buscarComposicaoNutricional);

// Rotas de ESCRITA
router.post("/", requireEscrita('produtos'), criarProduto);
router.put("/:id", requireEscrita('produtos'), editarProduto);
router.put("/:id/composicao-nutricional", requireEscrita('produtos'), salvarComposicaoNutricional);
router.post("/standardize-composicao", requireEscrita('produtos'), standardizarComposicaoNutricional);
router.delete("/:id", requireEscrita('produtos'), removerProduto);

export default router;
