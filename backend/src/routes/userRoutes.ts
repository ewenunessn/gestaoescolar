import { Router } from "express";
import { register, login, getUsers, getProfile } from "../controllers/userController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

// Rotas de usuário
router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, getProfile);
router.get("/", getUsers); // Listar usuários

export default router;
