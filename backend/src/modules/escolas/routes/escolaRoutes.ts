import { Router } from "express";
import * as escolaController from "../controllers/escolaController";
import { authenticateToken } from "../../../middleware/authMiddleware";
import { requireLeitura, requireEscrita } from "../../../middleware/permissionMiddleware";

const router = Router();

router.use(authenticateToken);

const {
  listarEscolas,
  buscarEscola,
  criarEscola,
  editarEscola,
  removerEscola
} = escolaController as any;

if (!listarEscolas || !buscarEscola || !criarEscola || !editarEscola || !removerEscola) {
  throw new Error("Controladores de escolas não carregados corretamente");
}

// Rotas de LEITURA
router.get("/", requireLeitura('escolas'), listarEscolas);
router.get("/:id", requireLeitura('escolas'), buscarEscola);

// Rotas de ESCRITA
router.post("/", requireEscrita('escolas'), criarEscola);
router.put("/:id", requireEscrita('escolas'), editarEscola);
router.delete("/:id", requireEscrita('escolas'), removerEscola);

export default router;
