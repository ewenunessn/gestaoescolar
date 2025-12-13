import { Router } from "express";
import {
  listarRefeicaoProdutos,
  adicionarRefeicaoProduto,
  editarRefeicaoProduto,
  removerRefeicaoProduto,
} from "../controllers/refeicaoProdutoController";
import { requireTenant } from "../../../middleware/tenantMiddleware";

const router = Router();

// Aplicar middleware de tenant para todas as rotas
router.use(requireTenant());

router.get("/:refeicaoId/produtos", listarRefeicaoProdutos);
router.post("/:refeicaoId/produtos", adicionarRefeicaoProduto);
router.put("/produtos/:id", editarRefeicaoProduto);
router.delete("/produtos/:id", removerRefeicaoProduto);

export default router;