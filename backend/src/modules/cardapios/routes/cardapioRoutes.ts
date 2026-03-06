import { Router } from "express";
import { authenticateToken } from "../../../middleware/authMiddleware";
import { 
  listarCardapiosModalidade,
  buscarCardapioModalidade,
  criarCardapioModalidade,
  editarCardapioModalidade,
  removerCardapioModalidade,
  listarRefeicoesCardapio,
  adicionarRefeicaoDia,
  removerRefeicaoDia
} from "../controllers/cardapioController";

const router = Router();

// Cardápios por modalidade
router.get("/", authenticateToken, listarCardapiosModalidade);
router.post("/", authenticateToken, criarCardapioModalidade);
router.get("/:id", authenticateToken, buscarCardapioModalidade);
router.put("/:id", authenticateToken, editarCardapioModalidade);
router.delete("/:id", authenticateToken, removerCardapioModalidade);

// Refeições do cardápio
router.get("/:cardapioId/refeicoes", authenticateToken, listarRefeicoesCardapio);
router.post("/:cardapioId/refeicoes", authenticateToken, adicionarRefeicaoDia);
router.delete("/refeicoes/:id", authenticateToken, removerRefeicaoDia);

export default router;
