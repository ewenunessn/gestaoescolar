import { Router } from "express";
import { 
  listarRefeicoes, 
  buscarRefeicao, 
  criarRefeicao, 
  atualizarRefeicao, 
  deletarRefeicao, 
  toggleAtivoRefeicao 
} from "../controllers/refeicaoController";
import { requireTenant } from "../../../middleware/tenantMiddleware";

const router = Router();

// Aplicar middleware de tenant para todas as rotas
router.use(requireTenant());

// Rotas para refeições - CRUD Completo
router.get("/", listarRefeicoes);                    // GET /api/refeicoes - Listar todas
router.get("/:id", buscarRefeicao);                  // GET /api/refeicoes/:id - Buscar por ID
router.post("/", criarRefeicao);                     // POST /api/refeicoes - Criar nova
router.put("/:id", atualizarRefeicao);               // PUT /api/refeicoes/:id - Atualizar
router.delete("/:id", deletarRefeicao);              // DELETE /api/refeicoes/:id - Deletar
router.patch("/:id/toggle", toggleAtivoRefeicao);    // PATCH /api/refeicoes/:id/toggle - Ativar/Desativar

export default router;