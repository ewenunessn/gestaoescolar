import { Router } from "express";
import { 
  buscarEstoqueConsolidadoProduto,
  listarEstoqueConsolidado,
  resetarEstoqueGlobal
} from "../controllers/estoqueConsolidadoController";

const router = Router();

// Listar estoque consolidado (resumo de todos os produtos)
router.get("/", listarEstoqueConsolidado);

// Buscar estoque consolidado de um produto específico
router.get("/produto/:produto_id", buscarEstoqueConsolidadoProduto);

// Resetar estoque global (todas as escolas) com backup
router.post("/reset", resetarEstoqueGlobal);

export default router;