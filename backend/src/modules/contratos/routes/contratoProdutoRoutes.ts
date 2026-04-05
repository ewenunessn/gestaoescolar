import { Router } from "express";
import { authenticateToken } from "../../../middleware/authMiddleware";
import {
  listarContratoProdutos,
  listarProdutosPorContrato,
  listarProdutosPorFornecedor,
  buscarContratoProduto,
  criarContratoProduto,
  editarContratoProduto,
  removerContratoProduto
} from "../controllers/contratoProdutoController";

const router = Router();

// Listar todos os contrato-produtos
router.get("/", listarContratoProdutos);

// Listar produtos de um contrato específico
router.get("/contrato/:contrato_id", listarProdutosPorContrato);

// Listar produtos de um fornecedor específico
router.get("/fornecedor/:fornecedor_id", listarProdutosPorFornecedor);

// Buscar contrato-produto por ID
router.get("/:id", buscarContratoProduto);

// Criar/editar/remover contrato-produto
router.post("/", authenticateToken, criarContratoProduto);
router.put("/:id", authenticateToken, editarContratoProduto);
router.delete("/:id", authenticateToken, removerContratoProduto);

export default router;