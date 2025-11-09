import { Router } from "express";
import { 
  listarEscolas, 
  buscarEscola, 
  criarEscola, 
  editarEscola, 
  removerEscola,
  importarEscolasLote 
} from "../controllers/escolaController";
import { tenantMiddleware } from "../../../middleware/tenantMiddleware";

const router = Router();

// Aplicar middleware de tenant para todas as rotas (com fallback para tenant padrão)
router.use(tenantMiddleware({ required: true, fallbackToDefault: true }));

// Listar escolas
router.get("/", listarEscolas);

// Buscar escola por ID
router.get("/:id", buscarEscola);

// Criar nova escola
router.post("/", criarEscola);

// Editar escola
router.put("/:id", editarEscola);

// Remover escola
router.delete("/:id", removerEscola);

// Importar escolas em lote
router.post("/importar-lote", importarEscolasLote);

export default router;