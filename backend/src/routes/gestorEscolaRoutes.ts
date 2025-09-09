import { Router } from "express";
import {
  listarEscolas,
  autenticarGestor,
  verificarAcesso
} from "../controllers/gestorEscolaController";

const router = Router();

// Listar todas as escolas ativas (para seleção)
router.get("/escolas", listarEscolas);

// Autenticar gestor com código de acesso
router.post("/autenticar", autenticarGestor);

// Verificar se o acesso ainda é válido
router.get("/verificar/:escola_id", verificarAcesso);

export default router;