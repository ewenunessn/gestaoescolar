import { Router } from "express";
import { checkSystemStatus, login, logout } from "../controllers/authController";
import { getProfile, getMePermissoes } from "../controllers/meController";
import { getUsers } from "../controllers/usuariosController";
import { authenticateToken } from "../../../middleware/authMiddleware";
import { requireAdmin } from "../../../middleware/adminMiddleware";

const router = Router();

// Rotas públicas
router.get("/system-status", checkSystemStatus);
router.post("/login", login);

// Rotas protegidas
router.post("/logout", authenticateToken, logout);
router.get("/me", authenticateToken, getProfile);
router.get("/me/permissoes", authenticateToken, getMePermissoes);
router.get("/", authenticateToken, requireAdmin, getUsers);

export default router;
