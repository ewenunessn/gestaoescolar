import { Router } from "express";
import { 
  listarFornecedores, 
  buscarFornecedor, 
  criarFornecedor, 
  editarFornecedor, 
  removerFornecedor,
  verificarRelacionamentosFornecedor
} from "../controllers/fornecedorController";
import { authenticateToken } from "../../../middleware/authMiddleware";
import { requireEscrita } from "../../../middleware/permissionMiddleware";

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas de LEITURA - Qualquer usuário autenticado pode acessar
router.get("/", listarFornecedores);
router.get("/:id/relacionamentos", verificarRelacionamentosFornecedor);
router.get("/:id", buscarFornecedor);

// Rotas de ESCRITA
router.post("/", requireEscrita('fornecedores'), criarFornecedor);
router.put("/:id", requireEscrita('fornecedores'), editarFornecedor);
router.delete("/:id", requireEscrita('fornecedores'), removerFornecedor);

export default router;
