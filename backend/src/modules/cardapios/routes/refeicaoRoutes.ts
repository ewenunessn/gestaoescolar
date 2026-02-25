import { Router } from "express";
import { 
  listarRefeicoes, 
  buscarRefeicao, 
  criarRefeicao, 
  editarRefeicao, 
  removerRefeicao, 
  toggleAtivoRefeicao 
} from "../controllers/refeicaoController";
const router = Router();

// Rotas para refeições - CRUD Completo
router.get("/", listarRefeicoes);                    // GET /api/refeicoes - Listar todas
router.get("/:id", buscarRefeicao);                  // GET /api/refeicoes/:id - Buscar por ID
router.post("/", criarRefeicao);                     // POST /api/refeicoes - Criar nova
router.put("/:id", editarRefeicao);                  // PUT /api/refeicoes/:id - Atualizar
router.delete("/:id", removerRefeicao);              // DELETE /api/refeicoes/:id - Deletar
router.patch("/:id/toggle", toggleAtivoRefeicao);    // PATCH /api/refeicoes/:id/toggle - Ativar/Desativar

export default router;