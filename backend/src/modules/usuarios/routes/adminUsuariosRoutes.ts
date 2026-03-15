import { Router } from "express";
import { authenticateToken } from "../../../middleware/authMiddleware";
import {
  requireAdmin,
  listarUsuarios, criarUsuario, atualizarUsuario, excluirUsuario,
  listarFuncoes, criarFuncao, atualizarFuncao, excluirFuncao,
  listarModulos, listarNiveis,
} from "../controllers/adminUsuariosController";

const router = Router();

// Todas as rotas exigem autenticação + ser admin
router.use(authenticateToken, requireAdmin as any);

// Usuários
router.get("/usuarios", listarUsuarios);
router.post("/usuarios", criarUsuario);
router.put("/usuarios/:id", atualizarUsuario);
router.delete("/usuarios/:id", excluirUsuario);

// Funções (roles)
router.get("/funcoes", listarFuncoes);
router.post("/funcoes", criarFuncao);
router.put("/funcoes/:id", atualizarFuncao);
router.delete("/funcoes/:id", excluirFuncao);

// Auxiliares
router.get("/modulos", listarModulos);
router.get("/niveis-permissao", listarNiveis);

export default router;
