import { Router } from "express";
import { login, getUsers, getProfile, checkSystemStatus } from "../controllers/userController";
import { getMePermissoes } from "../controllers/userController";
import { devAuthMiddleware as authMiddleware } from "../../../middleware/devAuthMiddleware";

const router = Router();

// Rotas públicas
router.get("/system-status", checkSystemStatus);
router.post("/login", login);

// Rotas protegidas
router.get("/me", authMiddleware, getProfile);
router.get("/me/permissoes", authMiddleware, getMePermissoes);
router.get("/", getUsers);

export default router;
