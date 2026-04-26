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
  listarProgramacoes,
  salvarProgramacoes,
  mesclarItens,
} from "../controllers/programacaoEntregaController";
import {
  buscarStatusGeracaoCompra,
  iniciarGeracaoCompraDaGuia,
  validarCompraDaGuia,
} from "../controllers/compraGenerationController";

import { authenticateToken } from "../../../middleware/authMiddleware";
import { requireLeitura, requireEscrita } from "../../../middleware/permissionMiddleware";

const router = Router();
router.use(authenticateToken);

// Rotas de compras - LEITURA
router.get("/estatisticas", requireLeitura('compras'), obterEstatisticasCompras);
router.get("/produtos-disponiveis", requireLeitura('compras'), listarTodosProdutosDisponiveis);
router.get("/jobs/:id", requireLeitura('compras'), buscarStatusGeracaoCompra);
router.get("/", requireLeitura('compras'), listarCompras);
router.get("/:id/resumo-tipo-fornecedor", requireLeitura('compras'), resumoTipoFornecedorCompra);
router.get("/:id", requireLeitura('compras'), buscarCompra);
router.get("/contrato/:contrato_id/produtos", requireLeitura('compras'), listarProdutosContrato);

// Rotas de compras - ESCRITA
router.post("/", requireEscrita('compras'), criarCompra);
router.post("/gerar-da-guia", requireEscrita('compras'), validarCompraDaGuia);
router.post("/gerar-da-guia/async", requireEscrita('compras'), iniciarGeracaoCompraDaGuia);
router.put("/:id", requireEscrita('compras'), atualizarCompra);
router.patch("/:id/status", requireEscrita('compras'), atualizarStatusCompra);
router.delete("/:id", requireEscrita('compras'), excluirCompra);

// Programação de entrega por escola
router.get("/itens/:pedido_item_id/programacoes", requireLeitura('compras'), listarProgramacoes);
router.put("/itens/:pedido_item_id/programacoes", requireEscrita('compras'), salvarProgramacoes);
router.post("/itens/mesclar", requireEscrita('compras'), mesclarItens);

export default router;
