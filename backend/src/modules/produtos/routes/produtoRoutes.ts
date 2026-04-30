import { NextFunction, Request, Response, Router } from "express";
import {
  listarProdutos,
  buscarProduto,
  criarProduto,
  editarProduto,
  removerProduto,
  buscarComposicaoNutricional,
  salvarComposicaoNutricional,
  standardizarComposicaoNutricional
} from "../controllers/produtoController";
import { authenticateToken } from "../../../middleware/authMiddleware";
import { requireEscrita, requireLeitura } from "../../../middleware/permissionMiddleware";

const router = Router();
const produtosRead = requireLeitura("produtos");
const produtosWrite = requireEscrita("produtos");

export function requireProdutosRead(req: Request, res: Response, next: NextFunction) {
  return produtosRead(req, res, next);
}

export function requireProdutosWrite(req: Request, res: Response, next: NextFunction) {
  return produtosWrite(req, res, next);
}

router.get("/", authenticateToken, requireProdutosRead, listarProdutos);
router.get("/:id", authenticateToken, requireProdutosRead, buscarProduto);
router.get("/:id/composicao-nutricional", authenticateToken, requireProdutosRead, buscarComposicaoNutricional);

router.post("/", authenticateToken, requireProdutosWrite, criarProduto);
router.put("/:id", authenticateToken, requireProdutosWrite, editarProduto);
router.put("/:id/composicao-nutricional", authenticateToken, requireProdutosWrite, salvarComposicaoNutricional);
router.post("/standardize-composicao", authenticateToken, requireProdutosWrite, standardizarComposicaoNutricional);
router.delete("/:id", authenticateToken, requireProdutosWrite, removerProduto);

export default router;
