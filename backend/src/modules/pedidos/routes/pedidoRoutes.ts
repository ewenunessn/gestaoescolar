import { Router } from "express";
import {
  listarPedidos,
  buscarPedido,
  criarPedido,
  atualizarPedido,
  atualizarStatusPedido,
  cancelarPedido,
  excluirPedido,
  obterEstatisticasPedidos,
  listarProdutosContrato,
  listarTodosProdutosDisponiveis,
  atualizarItensPedido
} from "../controllers/pedidoController";

import {
  calcularPreviaFaturamento,
  gerarFaturamento,
  buscarFaturamentosPorPedido
} from "../controllers/faturamentoController";
import { requireTenant } from "../../../middleware/tenantMiddleware";

const router = Router();

// Aplicar middleware de tenant para todas as rotas
router.use(requireTenant());

// Rotas de pedidos
router.get("/estatisticas", obterEstatisticasPedidos);
router.get("/produtos-disponiveis", listarTodosProdutosDisponiveis);
router.get("/", listarPedidos);
router.get("/:id", buscarPedido);
router.post("/", criarPedido);
router.put("/:id", atualizarPedido);
router.put("/:id/itens", atualizarItensPedido);
router.patch("/:id/status", atualizarStatusPedido);
router.delete("/:id", excluirPedido);
router.post("/:id/cancelar", cancelarPedido);
router.get("/contrato/:contrato_id/produtos", listarProdutosContrato);

// Rotas de faturamento específicas do pedido
router.get("/:pedido_id/faturamento/previa", calcularPreviaFaturamento);
router.post("/:pedido_id/faturamento", gerarFaturamento);
router.get("/:pedido_id/faturamentos", buscarFaturamentosPorPedido);

export default router;
