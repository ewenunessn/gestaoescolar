import { Router } from "express";
import {
  listarEstoqueEscola,
  buscarItemEstoqueEscola,
  atualizarQuantidadeEstoque,
  atualizarLoteQuantidades,
  listarHistoricoEstoque,
  obterResumoEstoque,
  inicializarEstoqueEscola,
  registrarMovimentacao
} from "../controllers/estoqueEscolaController";

const router = Router();

// Listar estoque de uma escola específica
router.get("/escola/:escola_id", listarEstoqueEscola);

// Obter resumo do estoque de uma escola
router.get("/escola/:escola_id/resumo", obterResumoEstoque);

// Listar histórico de movimentações
router.get("/escola/:escola_id/historico", listarHistoricoEstoque);

// Inicializar estoque para uma escola (adicionar produtos faltantes)
router.post("/escola/:escola_id/inicializar", inicializarEstoqueEscola);

// Registrar movimentação (entrada, saída, ajuste)
router.post("/escola/:escola_id/movimentacao", registrarMovimentacao);

// Atualizar quantidades em lote
router.put("/escola/:escola_id/lote", atualizarLoteQuantidades);

// Buscar item específico do estoque
router.get("/:id", buscarItemEstoqueEscola);

// Atualizar quantidade de um item específico
router.put("/:id", atualizarQuantidadeEstoque);

export default router;