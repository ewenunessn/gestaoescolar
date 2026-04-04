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
import { requireEscrita } from "../../../middleware/permissionMiddleware";

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas de LEITURA - Qualquer usuário autenticado pode acessar
router.get("/estatisticas", obterEstatisticasContratos);
router.get("/buscar-por-produto", buscarContratosPorProduto);
router.get("/", listarContratos);
router.get("/:id", buscarContrato);

// Rotas de ESCRITA
router.post("/", requireEscrita('contratos'), criarContrato);
router.put("/:id", requireEscrita('contratos'), editarContrato);
router.delete("/:id", requireEscrita('contratos'), removerContrato);

export default router;
