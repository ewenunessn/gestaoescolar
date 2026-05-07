import { Router } from "express";
import { authenticateToken } from "../../../middleware/authMiddleware";
import { requireEscrita, requireLeitura } from "../../../middleware/permissionMiddleware";
import {
  buscarItemEstoque,
  listarEstoqueEscola,
  listarHistoricoEscola,
  registrarMovimentacao,
} from "../controllers/estoqueEscolarController";

const router = Router();

router.get("/escola/:escolaId", authenticateToken, requireLeitura("estoque"), listarEstoqueEscola);
router.get("/escola/:escolaId/resumo", authenticateToken, requireLeitura("estoque"), listarEstoqueEscola);
router.get("/escola/:escolaId/historico", authenticateToken, requireLeitura("estoque"), listarHistoricoEscola);
router.get("/escola/:escolaId/produtos/:produtoId", authenticateToken, requireLeitura("estoque"), buscarItemEstoque);
router.post("/escola/:escolaId/movimentacao", authenticateToken, requireEscrita("estoque"), registrarMovimentacao);
router.post("/escola/:escolaId/movimentacao-lotes", authenticateToken, requireEscrita("estoque"), registrarMovimentacao);

export default router;
