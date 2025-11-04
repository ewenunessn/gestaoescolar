import { Router } from "express";
import { 
  listarFornecedores, 
  buscarFornecedor, 
  criarFornecedor, 
  editarFornecedor, 
  removerFornecedor,
  verificarRelacionamentosFornecedor
} from "../controllers/fornecedorController";
import { requireTenant } from "../../../middleware/tenantMiddleware";

const router = Router();

// Aplicar middleware de tenant para todas as rotas
router.use(requireTenant());

// Listar fornecedores (com filtros e paginação)
router.get("/", listarFornecedores);

// Verificar relacionamentos do fornecedor (deve vir antes da rota /:id)
router.get("/:id/relacionamentos", verificarRelacionamentosFornecedor);

// Buscar fornecedor por ID
router.get("/:id", buscarFornecedor);

// Criar novo fornecedor
router.post("/", criarFornecedor);

// Editar fornecedor
router.put("/:id", editarFornecedor);

// Remover fornecedor
router.delete("/:id", removerFornecedor);

export default router;