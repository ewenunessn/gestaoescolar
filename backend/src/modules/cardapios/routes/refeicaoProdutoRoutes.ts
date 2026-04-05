import { Router } from "express";
import { authenticateToken } from "../../../middleware/authMiddleware";
import {
  listarRefeicaoProdutos,
  adicionarRefeicaoProduto,
  editarRefeicaoProduto,
  removerRefeicaoProduto,
} from "../controllers/refeicaoProdutoController";
const router = Router();

router.get("/:refeicaoId/produtos", listarRefeicaoProdutos);
router.post("/:refeicaoId/produtos", authenticateToken, adicionarRefeicaoProduto);
router.put("/produtos/:id", authenticateToken, editarRefeicaoProduto);
router.delete("/produtos/:id", authenticateToken, removerRefeicaoProduto);

export default router;