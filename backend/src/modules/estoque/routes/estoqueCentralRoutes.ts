import { Router } from "express";
import {
  listarPosicaoEstoque,
  listarLotesProduto,
  listarTodosLotes,
  criarLote,
  processarSaidaEstoque,
  listarMovimentacoes,
  listarAlertas,
  atualizarAlertas,
  resolverAlerta,
  detalharLote,
  rastreabilidadeLote
} from "../controllers/estoqueCentralController";
import { devAuthMiddleware as authMiddleware } from "../../../middlewares";

const router = Router();

// Rotas principais do estoque
router.get("/posicao", authMiddleware, listarPosicaoEstoque);
router.get("/alertas", authMiddleware, listarAlertas);
router.post("/alertas/atualizar", authMiddleware, atualizarAlertas);
router.put("/alertas/:alerta_id/resolver", authMiddleware, resolverAlerta);

// Rotas de lotes
router.get("/lotes", authMiddleware, listarTodosLotes);
router.get("/produtos/:produto_id/lotes", authMiddleware, listarLotesProduto);
router.post("/lotes", authMiddleware, criarLote);




router.get("/lotes/:lote_id", authMiddleware, detalharLote);
router.get("/lotes/:lote_id/rastreabilidade", authMiddleware, rastreabilidadeLote);

// Rotas de movimentações
router.get("/produtos/:produto_id/movimentacoes", authMiddleware, listarMovimentacoes);
router.post("/saidas", authMiddleware, processarSaidaEstoque);

export default router;
