import { Router } from "express";
import {
  listarEscolaModalidades,
  buscarEscolaModalidade,
  criarEscolaModalidade,
  atualizarEscolaModalidade,
  deletarEscolaModalidade,
  listarModalidadesPorEscola,
} from "../controllers/escolaModalidadeController";

const router = Router();

router.get("/", listarEscolaModalidades);
router.get("/escola/:escola_id", listarModalidadesPorEscola);
router.get("/:id", buscarEscolaModalidade);
router.post("/", criarEscolaModalidade);
router.put("/:id", atualizarEscolaModalidade);
router.delete("/:id", deletarEscolaModalidade);

export default router;