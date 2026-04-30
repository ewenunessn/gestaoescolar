import { NextFunction, Request, Response, Router } from "express";
import { authenticateToken } from "../../../middleware/authMiddleware";
import { requireEscrita, requireLeitura } from "../../../middleware/permissionMiddleware";
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
const contratosRead = requireLeitura("contratos");
const contratosWrite = requireEscrita("contratos");

export function requireContratosRead(req: Request, res: Response, next: NextFunction) {
  return contratosRead(req, res, next);
}

export function requireContratosWrite(req: Request, res: Response, next: NextFunction) {
  return contratosWrite(req, res, next);
}

// Listar todos os contrato-produtos
router.get("/", authenticateToken, requireContratosRead, listarContratoProdutos);

// Listar produtos de um contrato específico
router.get("/contrato/:contrato_id", authenticateToken, requireContratosRead, listarProdutosPorContrato);

// Listar produtos de um fornecedor específico
router.get("/fornecedor/:fornecedor_id", authenticateToken, requireContratosRead, listarProdutosPorFornecedor);

// Buscar contrato-produto por ID
router.get("/:id", authenticateToken, requireContratosRead, buscarContratoProduto);

// Criar/editar/remover contrato-produto
router.post("/", authenticateToken, requireContratosWrite, criarContratoProduto);
router.put("/:id", authenticateToken, requireContratosWrite, editarContratoProduto);
router.delete("/:id", authenticateToken, requireContratosWrite, removerContratoProduto);

export default router;
