import { Router } from "express";
import {
  listarCompras,
  buscarCompra,
  criarCompra,
  atualizarCompra,
  atualizarStatusCompra,
  excluirCompra,
  obterEstatisticasCompras,
  listarProdutosContrato,
  listarTodosProdutosDisponiveis,
  resumoTipoFornecedorCompra
} from "../controllers/compraController";

import {
  calcularPreviaFaturamento,
  gerarFaturamento,
  buscarFaturamentosPorPedido
} from "../controllers/faturamentoController";

import {
  listarProgramacoes,
  salvarProgramacoes,
  mesclarItens,
} from "../controllers/programacaoEntregaController";

import { authenticateToken } from "../../../middleware/authMiddleware";

const router = Router();
router.use(authenticateToken);

// Rotas de compras
router.get("/estatisticas", obterEstatisticasCompras);
router.get("/produtos-disponiveis", listarTodosProdutosDisponiveis);
router.get("/", listarCompras);
router.get("/:id/resumo-tipo-fornecedor", resumoTipoFornecedorCompra);
router.get("/:id", buscarCompra);
router.post("/", criarCompra);
router.put("/:id", atualizarCompra);
router.patch("/:id/status", atualizarStatusCompra);
router.delete("/:id", excluirCompra);
router.get("/contrato/:contrato_id/produtos", listarProdutosContrato);

// Programação de entrega por escola
router.get("/itens/:pedido_item_id/programacoes", listarProgramacoes);
router.put("/itens/:pedido_item_id/programacoes", salvarProgramacoes);
router.post("/itens/mesclar", mesclarItens);

// Rotas de faturamento
router.get("/:pedido_id/faturamento/previa", calcularPreviaFaturamento);
router.post("/:pedido_id/faturamento", gerarFaturamento);
router.get("/:pedido_id/faturamentos", buscarFaturamentosPorPedido);

export default router;
