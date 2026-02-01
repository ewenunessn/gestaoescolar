import { Router } from "express";
import {
  listarEstoqueEscola,
  buscarItemEstoqueEscola,
  atualizarQuantidadeEstoque,
  atualizarLoteQuantidades,
  listarHistoricoEstoque,
  obterResumoEstoque,
  inicializarEstoqueEscola,
  registrarMovimentacao,
  resetarEstoqueComBackup,
  listarLotesProduto,
  criarLote,
  processarMovimentacaoLotes,
  testarLotes
} from "../controllers/estoqueEscolaController";
const router = Router();

// Aplicar middleware de tenant para a maioria das rotas
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

// Resetar estoque da escola com backup
router.post("/escola/:escola_id/reset", resetarEstoqueComBackup);

// Atualizar quantidades em lote
router.put("/escola/:escola_id/lote", atualizarLoteQuantidades);

// Buscar item específico do estoque
router.get("/:id", buscarItemEstoqueEscola);

// Atualizar quantidade de um item específico
router.put("/:id", atualizarQuantidadeEstoque);

// Rotas para lotes (sem autenticação JWT)
router.get("/test-lotes", testarLotes);
router.get("/produtos/:produto_id/lotes", listarLotesProduto);
router.post("/lotes", criarLote);
router.post("/escola/:escola_id/movimentacao-lotes", processarMovimentacaoLotes);

export default router;