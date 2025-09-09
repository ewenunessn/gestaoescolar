import { Router } from "express";
import { 
  listarEscolas, 
  buscarEscola, 
  criarEscola, 
  editarEscola, 
  removerEscola,
  importarEscolasLote 
} from "../controllers/escolaController";

const router = Router();

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
