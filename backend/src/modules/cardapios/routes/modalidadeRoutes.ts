import { Router } from "express";
import { authenticateToken } from "../../../middleware/authMiddleware";
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
router.post("/", authenticateToken, criarModalidade);

// Editar modalidade
router.put("/:id", authenticateToken, editarModalidade);

// Remover modalidade
router.delete("/:id", authenticateToken, removerModalidade);

// Desativar modalidade (soft delete)
router.patch("/:id/desativar", authenticateToken, desativarModalidade);

// Reativar modalidade
router.patch("/:id/reativar", authenticateToken, reativarModalidade);

export default router;