import { Router } from "express";
import * as escolaController from "../controllers/escolaController";
import { authenticateToken } from "../../../middleware/authMiddleware";
import { requireEscrita } from "../../../middleware/permissionMiddleware";

const router = Router();

router.use(authenticateToken);

const {
  listarEscolas,
  buscarEscola,
  criarEscola,
  editarEscola,
  removerEscola
} = escolaController;

if (!listarEscolas || !buscarEscola || !criarEscola || !editarEscola || !removerEscola) {
  throw new Error("Controladores de escolas não carregados corretamente");
}

// Rotas de LEITURA - Qualquer usuário autenticado pode acessar
router.get("/", listarEscolas);
router.get("/:id", buscarEscola);

// Rotas de ESCRITA
router.post("/", requireEscrita('escolas'), criarEscola);
router.put("/:id", requireEscrita('escolas'), editarEscola);
router.delete("/:id", requireEscrita('escolas'), removerEscola);

export default router;
