import { Router } from "express";
import { 
  listarRefeicoes, 
  buscarRefeicao, 
  criarRefeicao, 
  editarRefeicao, 
  removerRefeicao, 
  toggleAtivoRefeicao,
  duplicarRefeicao,
  buscarFichaTecnica
} from "../controllers/refeicaoController";
import {
  listarRefeicaoProdutos,
  adicionarRefeicaoProduto,
  editarRefeicaoProduto,
  removerRefeicaoProduto,
} from "../controllers/refeicaoProdutoController";
import { authenticateToken } from "../../../middleware/authMiddleware";
import { requireLeitura, requireEscrita } from "../../../middleware/permissionMiddleware";

const router = Router();

// Rota pública para ficha técnica (sem autenticação)
router.get("/:id/ficha-tecnica", buscarFichaTecnica);

// Todas as outras rotas requerem autenticação
router.use(authenticateToken);

// Rotas de LEITURA - Refeições
router.get("/", requireLeitura('refeicoes'), listarRefeicoes);
router.get("/:id", requireLeitura('refeicoes'), buscarRefeicao);
router.get("/:refeicaoId/produtos", requireLeitura('refeicoes'), listarRefeicaoProdutos);

// Rotas de ESCRITA - Refeições
router.post("/", requireEscrita('refeicoes'), criarRefeicao);
router.post("/:id/duplicar", requireEscrita('refeicoes'), duplicarRefeicao);
router.put("/:id", requireEscrita('refeicoes'), editarRefeicao);
router.delete("/:id", requireEscrita('refeicoes'), removerRefeicao);
router.patch("/:id/toggle", requireEscrita('refeicoes'), toggleAtivoRefeicao);

// Rotas de ESCRITA - Produtos da refeição
router.post("/:refeicaoId/produtos", requireEscrita('refeicoes'), adicionarRefeicaoProduto);
router.put("/produtos/:id", requireEscrita('refeicoes'), editarRefeicaoProduto);
router.delete("/produtos/:id", requireEscrita('refeicoes'), removerRefeicaoProduto);

export default router;
