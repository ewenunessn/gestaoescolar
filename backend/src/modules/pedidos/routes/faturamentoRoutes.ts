import { Router } from "express";
import {
  listarFaturamentos,
  buscarFaturamento,
  atualizarStatusFaturamento,
  excluirFaturamento,
  obterResumoFaturamento,
  registrarConsumoFaturamento,
  registrarConsumoItem,
  reverterConsumoItem,
  removerItensModalidade
} from "../controllers/faturamentoController";
import { authenticateToken } from "../../../middleware/authMiddleware";

const router = Router();

// Aplicar middleware de autenticação e tenant para todas as rotas
router.use(authenticateToken);
// Rotas gerais de faturamento
router.get("/", listarFaturamentos);
router.get("/:id", buscarFaturamento);
router.get("/:id/resumo", obterResumoFaturamento);
router.post("/:id/registrar-consumo", registrarConsumoFaturamento);
router.post("/:id/itens/:itemId/registrar-consumo", registrarConsumoItem);
router.post("/:id/itens/:itemId/reverter-consumo", reverterConsumoItem);
router.delete("/:id/remover-modalidade", removerItensModalidade);
router.patch("/:id/status", atualizarStatusFaturamento);
router.delete("/:id", excluirFaturamento);

export default router;