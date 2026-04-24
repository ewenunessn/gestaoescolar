import { Router } from "express";
import { authenticateToken } from "../../../middleware/authMiddleware";
import {
  listarModalidades,
  listarCategoriasFinanceirasModalidade,
  criarCategoriaFinanceiraModalidade,
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

// Listar categorias financeiras usadas pelas modalidades
router.get("/categorias-financeiras", listarCategoriasFinanceirasModalidade);

// Criar categoria financeira explicitamente para evitar duplicidade por digitação
router.post("/categorias-financeiras", authenticateToken, criarCategoriaFinanceiraModalidade);

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
