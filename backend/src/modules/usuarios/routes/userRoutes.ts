import { Router } from "express";
import { login, logout, getUsers, getProfile, checkSystemStatus } from "../controllers/userController";
import { getMePermissoes } from "../controllers/userController";
import { authenticateToken } from "../../../middleware/authMiddleware";
import { requireAdmin } from "../controllers/adminUsuariosController";

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
