import { Router } from "express";
import { authenticateToken } from "../../../middleware/authMiddleware";
import {
  listarEscolaModalidades,
  buscarEscolaModalidade,
  criarEscolaModalidade,
  atualizarEscolaModalidade,
  deletarEscolaModalidade,
  listarModalidadesPorEscola,
  listarHistoricoEscolaModalidades,
  relatorioAlunosModalidades,
} from "../controllers/escolaModalidadeController";

const router = Router();

router.get("/", listarEscolaModalidades);
router.get("/historico", listarHistoricoEscolaModalidades);
router.get("/relatorio-alunos", relatorioAlunosModalidades);
router.get("/escola/:escola_id", listarModalidadesPorEscola);
router.get("/:id", buscarEscolaModalidade);
router.post("/", authenticateToken, criarEscolaModalidade);
router.put("/:id", authenticateToken, atualizarEscolaModalidade);
router.delete("/:id", authenticateToken, deletarEscolaModalidade);

export default router;
