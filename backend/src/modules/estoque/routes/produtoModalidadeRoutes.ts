import { Router } from "express";
import { authenticateToken } from "../../../middleware/authMiddleware";
import {
  listarProdutoModalidades,
  buscarProdutoModalidade,
  criarProdutoModalidade,
  editarProdutoModalidade,
  removerProdutoModalidade
} from "../controllers/produtoModalidadeController";

const router = Router();

// Listar todas as associações produto-modalidade
router.get("/", listarProdutoModalidades);

// Buscar associação produto-modalidade por ID
router.get("/:id", buscarProdutoModalidade);

// Criar/editar/remover associação produto-modalidade
router.post("/", authenticateToken, criarProdutoModalidade);
router.put("/:id", authenticateToken, editarProdutoModalidade);
router.delete("/:id", authenticateToken, removerProdutoModalidade);

export default router;