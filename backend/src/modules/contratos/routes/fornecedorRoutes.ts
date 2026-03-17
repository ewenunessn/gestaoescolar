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
import { requireLeitura, requireEscrita } from "../../../middleware/permissionMiddleware";

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas de LEITURA
router.get("/", requireLeitura('fornecedores'), listarFornecedores);
router.get("/:id/relacionamentos", requireLeitura('fornecedores'), verificarRelacionamentosFornecedor);
router.get("/:id", requireLeitura('fornecedores'), buscarFornecedor);

// Rotas de ESCRITA
router.post("/", requireEscrita('fornecedores'), criarFornecedor);
router.put("/:id", requireEscrita('fornecedores'), editarFornecedor);
router.delete("/:id", requireEscrita('fornecedores'), removerFornecedor);

export default router;
