import { Router } from "express";
import { 
  listarContratos, 
  buscarContrato, 
  criarContrato,
  editarContrato,
  removerContrato,
  obterEstatisticasContratos,
  buscarContratosPorProduto
} from "../controllers/contratoController";
import { authenticateToken } from "../../../middleware/authMiddleware";
import { requireLeitura, requireEscrita } from "../../../middleware/permissionMiddleware";

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas de LEITURA
router.get("/estatisticas", requireLeitura('contratos'), obterEstatisticasContratos);
router.get("/buscar-por-produto", requireLeitura('contratos'), buscarContratosPorProduto);
router.get("/", requireLeitura('contratos'), listarContratos);
router.get("/:id", requireLeitura('contratos'), buscarContrato);

// Rotas de ESCRITA
router.post("/", requireEscrita('contratos'), criarContrato);
router.put("/:id", requireEscrita('contratos'), editarContrato);
router.delete("/:id", requireEscrita('contratos'), removerContrato);

export default router;
