import { Router } from "express";
import {
  buscarEstoqueEscolarProduto,
  listarEstoqueEscolar,
  resetEstoque
} from "../controllers/estoqueEscolarController";

const router = Router();

// Listar estoque escolar (resumo de todos os produtos)
router.get("/", listarEstoqueEscolar);

// Buscar estoque escolar de um produto específico
router.get("/produto/:produto_id", buscarEstoqueEscolarProduto);

// Resetar estoque global (todas as escolas) com backup
router.post("/reset", resetEstoque);

export default router;