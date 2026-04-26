import { Router } from "express";
import { devAuthMiddleware as authMiddleware } from "../../../middleware/devAuthMiddleware";
import {
  listarEstoqueEscola,
  buscarItemEstoque,
  listarHistoricoEscola,
  registrarMovimentacao,
  buscarConfiguracaoOperacaoEscola,
} from "../controllers/estoqueEscolarController";

const router = Router();

router.get("/escolas/:escolaId", authMiddleware, listarEstoqueEscola);
router.get("/escolas/:escolaId/dashboard", authMiddleware, listarEstoqueEscola);
router.get("/escolas/:escolaId/produtos/:produtoId", authMiddleware, buscarItemEstoque);
router.get("/escolas/:escolaId/historico", authMiddleware, listarHistoricoEscola);
router.get("/escolas/:escolaId/eventos", authMiddleware, listarHistoricoEscola);
router.get("/escolas/:escolaId/operacao", authMiddleware, buscarConfiguracaoOperacaoEscola);
router.post("/escolas/:escolaId/movimentacoes", authMiddleware, registrarMovimentacao);

export default router;

