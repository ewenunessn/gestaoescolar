import { Router } from "express";
import { 
  listarCardapios, 
  buscarCardapio,
  criarCardapio,
  atualizarCardapio,
  deletarCardapio,
  listarCardapioRefeicoes,
  adicionarRefeicaoCardapio,
  atualizarRefeicaoCardapio,
  removerRefeicaoCardapio,
  calcularNecessidades,
  calcularCustoRefeicoes
} from "../controllers/cardapioController";
const router = Router();

// CRUD Cardápios
router.get("/", listarCardapios);
router.post("/", criarCardapio);
router.get("/:id", buscarCardapio);
router.put("/:id", atualizarCardapio);
router.delete("/:id", deletarCardapio);

// Gerenciar refeições do cardápio
router.get("/:cardapioId/refeicoes", listarCardapioRefeicoes);
router.post("/:cardapioId/refeicoes", adicionarRefeicaoCardapio);
router.put("/refeicoes/:refeicaoId", atualizarRefeicaoCardapio);
router.delete("/:cardapioId/refeicoes/:refeicaoId", removerRefeicaoCardapio);

// Calcular necessidades do cardápio
router.get("/:id/necessidades", calcularNecessidades);

// Calcular custo das refeições do cardápio
router.get("/:id/custo-refeicoes", calcularCustoRefeicoes);

export default router;