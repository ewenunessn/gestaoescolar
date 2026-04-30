import { Router } from "express";
import { login, getUsers, getProfile, checkSystemStatus } from "../controllers/userController";
import { getMePermissoes } from "../controllers/userController";
import { authenticateToken } from "../../../middleware/authMiddleware";

const router = Router();

// Rotas públicas
router.get("/system-status", checkSystemStatus);
router.post("/login", login);

// Rotas protegidas
router.get("/me", authenticateToken, getProfile);
router.get("/me/permissoes", authenticateToken, getMePermissoes);
router.get("/", getUsers);

export default router;
