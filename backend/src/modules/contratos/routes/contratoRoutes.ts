import { Router } from "express";
import { 
  listarContratos, 
  buscarContrato, 
  listarContratosPorFornecedor,
  criarContrato,
  editarContrato,
  removerContrato,
  obterEstatisticasContratos
} from "../controllers/contratoController";
import { requireTenant } from "../../../middleware/tenantMiddleware";

const router = Router();

// Aplicar middleware de tenant para todas as rotas
router.use(requireTenant());

// Obter estatísticas de contratos
router.get("/estatisticas", obterEstatisticasContratos);

// Listar contratos (com filtros e paginação)
router.get("/", listarContratos);

// Listar contratos por fornecedor
router.get("/fornecedor/:fornecedor_id", listarContratosPorFornecedor);

// Buscar contrato por ID
router.get("/:id", buscarContrato);

// Criar novo contrato
router.post("/", criarContrato);

// Editar contrato
router.put("/:id", editarContrato);

// Remover contrato
router.delete("/:id", removerContrato);

export default router;