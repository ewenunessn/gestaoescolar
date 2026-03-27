import { Router } from "express";
import { authenticateToken } from "../../../middleware/authMiddleware";
import { requireLeitura, requireEscrita } from "../../../middleware/permissionMiddleware";
import { 
  listarCardapiosModalidade,
  buscarCardapioModalidade,
  criarCardapioModalidade,
  editarCardapioModalidade,
  removerCardapioModalidade,
  listarRefeicoesCardapio,
  adicionarRefeicaoDia,
  removerRefeicaoDia,
  calcularCustoCardapio
} from "../controllers/cardapioController";

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas de LEITURA - Cardápios por modalidade
router.get("/", requireLeitura('cardapios'), listarCardapiosModalidade);
router.get("/:id", requireLeitura('cardapios'), buscarCardapioModalidade);
router.get("/:cardapioId/refeicoes", requireLeitura('cardapios'), listarRefeicoesCardapio);

// Rotas de ESCRITA - Cardápios por modalidade
router.post("/", requireEscrita('cardapios'), criarCardapioModalidade);
router.put("/:id", requireEscrita('cardapios'), editarCardapioModalidade);
router.delete("/:id", requireEscrita('cardapios'), removerCardapioModalidade);
router.post("/:cardapioId/refeicoes", requireEscrita('cardapios'), adicionarRefeicaoDia);
router.delete("/refeicoes/:id", requireEscrita('cardapios'), removerRefeicaoDia);

// Rotas de CÁLCULO - Custo do cardápio
router.get("/:cardapioId/custo", requireLeitura('cardapios'), calcularCustoCardapio);

export default router;
