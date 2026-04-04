import { Router } from "express";
import { devAuthMiddleware as authMiddleware } from "../../../middleware/devAuthMiddleware";
import {
  listarEstoqueEscola,
  debugEstoqueEscola,
  buscarItemEstoque,
  listarHistoricoEscola,
  registrarMovimentacao
} from "../controllers/estoqueEscolarController";

const router = Router();

router.get("/escolas/:escolaId/debug", authMiddleware, debugEstoqueEscola);
router.get("/escolas/:escolaId", authMiddleware, listarEstoqueEscola);
router.get("/escolas/:escolaId/produtos/:produtoId", authMiddleware, buscarItemEstoque);
router.get("/escolas/:escolaId/historico", authMiddleware, listarHistoricoEscola);
router.post("/escolas/:escolaId/movimentacoes", authMiddleware, registrarMovimentacao);

export default router;

