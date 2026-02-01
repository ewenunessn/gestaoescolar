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
const router = Router();

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