import { Router } from "express";
import {
  listarEscolaModalidades,
  buscarEscolaModalidade,
  criarEscolaModalidade,
  atualizarEscolaModalidade,
  deletarEscolaModalidade,
} from "../controllers/escolaModalidadeController";

const router = Router();

router.get("/", listarEscolaModalidades);
router.get("/:id", buscarEscolaModalidade);
router.post("/", criarEscolaModalidade);
router.put("/:id", atualizarEscolaModalidade);
router.delete("/:id", deletarEscolaModalidade);

export default router;