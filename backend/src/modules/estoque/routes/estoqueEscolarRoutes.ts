import { Router } from "express";
import { authenticateToken } from "../../../middleware/authMiddleware";
import { requireEscrita, requireLeitura } from "../../../middleware/permissionMiddleware";
import {
  listarEstoqueEscola,
  buscarItemEstoque,
  listarHistoricoEscola,
  registrarMovimentacao,
  buscarConfiguracaoOperacaoEscola,
} from "../controllers/estoqueEscolarController";

const router = Router();

router.get("/escolas/:escolaId", authenticateToken, requireLeitura("estoque"), listarEstoqueEscola);
router.get("/escolas/:escolaId/dashboard", authenticateToken, requireLeitura("estoque"), listarEstoqueEscola);
router.get("/escolas/:escolaId/produtos/:produtoId", authenticateToken, requireLeitura("estoque"), buscarItemEstoque);
router.get("/escolas/:escolaId/historico", authenticateToken, requireLeitura("estoque"), listarHistoricoEscola);
router.get("/escolas/:escolaId/eventos", authenticateToken, requireLeitura("estoque"), listarHistoricoEscola);
router.get("/escolas/:escolaId/operacao", authenticateToken, requireLeitura("estoque"), buscarConfiguracaoOperacaoEscola);
router.post("/escolas/:escolaId/movimentacoes", authenticateToken, requireEscrita("estoque"), registrarMovimentacao);

export default router;

