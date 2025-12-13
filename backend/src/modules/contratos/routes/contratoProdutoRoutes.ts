import { Router } from "express";
import { 
  listarContratoProdutos, 
  listarProdutosPorContrato,
  listarProdutosPorFornecedor,
  buscarContratoProduto,
  criarContratoProduto,
  editarContratoProduto,
  removerContratoProduto
} from "../controllers/contratoProdutoController";
import { requireTenant } from "../../../middleware/tenantMiddleware";

const router = Router();

// Aplicar middleware de tenant para todas as rotas
router.use(requireTenant());

// Listar todos os contrato-produtos
router.get("/", listarContratoProdutos);

// Listar produtos de um contrato específico
router.get("/contrato/:contrato_id", listarProdutosPorContrato);

// Listar produtos de um fornecedor específico
router.get("/fornecedor/:fornecedor_id", listarProdutosPorFornecedor);

// Buscar contrato-produto por ID
router.get("/:id", buscarContratoProduto);

// Criar novo contrato-produto
router.post("/", criarContratoProduto);

// Editar contrato-produto
router.put("/:id", editarContratoProduto);

// Remover contrato-produto
router.delete("/:id", removerContratoProduto);

export default router;