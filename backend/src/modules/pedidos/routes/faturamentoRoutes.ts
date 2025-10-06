import { Router } from "express";
import {
  listarFaturamentos,
  buscarFaturamento,
  atualizarStatusFaturamento,
  excluirFaturamento,
  obterResumoFaturamento
} from "../controllers/faturamentoController";

const router = Router();

// Rotas gerais de faturamento
router.get("/", listarFaturamentos);
router.get("/:id", buscarFaturamento);
router.get("/:id/resumo", obterResumoFaturamento);
router.patch("/:id/status", atualizarStatusFaturamento);
router.delete("/:id", excluirFaturamento);

export default router;