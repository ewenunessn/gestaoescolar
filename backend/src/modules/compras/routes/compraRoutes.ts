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
import { authenticateToken } from "../../../middleware/authMiddleware";

const router = Router();

// Aplicar middleware de autenticação para todas as rotas
router.use(authenticateToken);

// Rotas de compras
router.get("/estatisticas", obterEstatisticasCompras);
router.get("/produtos-disponiveis", listarTodosProdutosDisponiveis);
router.get("/", listarCompras);
router.get("/:id/resumo-tipo-fornecedor", resumoTipoFornecedorCompra);
router.get("/:id", buscarCompra);
router.post("/", criarCompra);
router.put("/:id", atualizarCompra); // Agora permite editar itens também
router.patch("/:id/status", atualizarStatusCompra);
router.delete("/:id", excluirCompra);
router.get("/contrato/:contrato_id/produtos", listarProdutosContrato);

// Rotas de faturamento específicas da compra
router.get("/:pedido_id/faturamento/previa", calcularPreviaFaturamento);
router.post("/:pedido_id/faturamento", gerarFaturamento);
router.get("/:pedido_id/faturamentos", buscarFaturamentosPorPedido);

export default router;
