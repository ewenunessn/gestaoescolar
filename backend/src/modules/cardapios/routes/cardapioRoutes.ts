import { Router } from "express";
import { 
  // Cardápios por modalidade
  listarCardapiosModalidade,
  buscarCardapioModalidade,
  criarCardapioModalidade,
  editarCardapioModalidade,
  removerCardapioModalidade,
  
  // Refeições do dia
  listarRefeicoesCardapio,
  buscarRefeicaoDia,
  criarRefeicaoDia,
  editarRefeicaoDia,
  removerRefeicaoDia,
  
  // Produtos da refeição
  listarProdutosRefeicao,
  adicionarProdutoRefeicao,
  editarProdutoRefeicao,
  removerProdutoRefeicao
} from "../controllers/cardapioController";

const router = Router();

// ============= CARDÁPIOS POR MODALIDADE =============
router.get("/", listarCardapiosModalidade);
router.post("/", criarCardapioModalidade);
router.get("/:id", buscarCardapioModalidade);
router.put("/:id", editarCardapioModalidade);
router.delete("/:id", removerCardapioModalidade);

// ============= REFEIÇÕES DO DIA =============
router.get("/:cardapio_id/refeicoes", listarRefeicoesCardapio);
router.post("/:cardapio_id/refeicoes", criarRefeicaoDia);
router.get("/refeicoes/:id", buscarRefeicaoDia);
router.put("/refeicoes/:id", editarRefeicaoDia);
router.delete("/refeicoes/:id", removerRefeicaoDia);

// ============= PRODUTOS DA REFEIÇÃO =============
router.get("/refeicoes/:refeicao_id/produtos", listarProdutosRefeicao);
router.post("/refeicoes/:refeicao_id/produtos", adicionarProdutoRefeicao);
router.put("/refeicoes/produtos/:id", editarProdutoRefeicao);
router.delete("/refeicoes/produtos/:id", removerProdutoRefeicao);

export default router;
