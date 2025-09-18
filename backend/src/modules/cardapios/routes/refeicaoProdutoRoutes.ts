import { Router } from "express";
import {
  listarRefeicaoProdutos,
  adicionarRefeicaoProduto,
  editarRefeicaoProduto,
  removerRefeicaoProduto,
} from "../controllers/refeicaoProdutoController";

const router = Router();

router.get("/:refeicaoId/produtos", listarRefeicaoProdutos);
router.post("/:refeicaoId/produtos", adicionarRefeicaoProduto);
router.put("/produtos/:id", editarRefeicaoProduto);
router.delete("/produtos/:id", removerRefeicaoProduto);

export default router;