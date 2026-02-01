import { Router } from "express";
import { 
  listarModalidades, 
  buscarModalidade, 
  criarModalidade, 
  editarModalidade, 
  removerModalidade,
  desativarModalidade,
  reativarModalidade
} from "../controllers/modalidadeController";
const router = Router();

// Listar modalidades
router.get("/", listarModalidades);

// Buscar modalidade por ID
router.get("/:id", buscarModalidade);

// Criar nova modalidade
router.post("/", criarModalidade);

// Editar modalidade
router.put("/:id", editarModalidade);

// Remover modalidade
router.delete("/:id", removerModalidade);

// Desativar modalidade (soft delete)
router.patch("/:id/desativar", desativarModalidade);

// Reativar modalidade
router.patch("/:id/reativar", reativarModalidade);

export default router;