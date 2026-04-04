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
import { requireEscrita } from "../../../middleware/permissionMiddleware";

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas de LEITURA - Qualquer usuário autenticado pode acessar
router.get("/", listarProdutos);
router.get("/:id", buscarProduto);
router.get("/:id/composicao-nutricional", buscarComposicaoNutricional);

// Rotas de ESCRITA - Requerem permissão de escrita
router.post("/", requireEscrita('produtos'), criarProduto);
router.put("/:id", requireEscrita('produtos'), editarProduto);
router.put("/:id/composicao-nutricional", requireEscrita('produtos'), salvarComposicaoNutricional);
router.post("/standardize-composicao", requireEscrita('produtos'), standardizarComposicaoNutricional);
router.delete("/:id", requireEscrita('produtos'), removerProduto);

export default router;
