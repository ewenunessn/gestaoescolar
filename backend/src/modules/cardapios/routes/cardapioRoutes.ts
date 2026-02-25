import { Router } from "express";
import { 
  listarCardapios, 
  buscarCardapio,
  criarCardapio,
  editarCardapio,
  removerCardapio,
  calcularCustoRefeicoes,
  listarCardapioRefeicoes
} from "../controllers/cardapioController";
const router = Router();

// CRUD Cardápios
router.get("/", listarCardapios);
router.post("/", criarCardapio);
router.get("/:id", buscarCardapio);
router.put("/:id", editarCardapio);
router.delete("/:id", removerCardapio);

// Listar refeições do cardápio
router.get("/:id/refeicoes", listarCardapioRefeicoes);

// Calcular custo das refeições do cardápio
router.get("/:id/custo-refeicoes", calcularCustoRefeicoes);

export default router;