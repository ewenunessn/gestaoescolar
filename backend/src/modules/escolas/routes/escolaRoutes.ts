import { Router } from "express";
import * as escolaController from "../controllers/escolaController";
import { authenticateToken } from "../../../middleware/authMiddleware";

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

router.get("/", listarEscolas);
router.get("/:id", buscarEscola);
router.post("/", criarEscola);
router.put("/:id", editarEscola);
router.delete("/:id", removerEscola);

export default router;
