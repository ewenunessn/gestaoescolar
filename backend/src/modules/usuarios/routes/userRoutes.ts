import { Router } from "express";
import { register, login, getUsers, getProfile, checkSystemStatus } from "../controllers/userController";
import { devAuthMiddleware as authMiddleware } from "../../../middlewares";

const router = Router();

// Rotas públicas
router.get("/system-status", checkSystemStatus);
router.post("/register", register);
router.post("/login", login);

// Rotas protegidas
router.get("/me", authMiddleware, getProfile);
router.get("/", getUsers); // Listar usuários

// Rota de debug temporária
router.get("/debug-jwt", (req, res) => {
  const { config } = require("../../../config/config");
  res.json({
    nodeEnv: process.env.NODE_ENV,
    jwtSecretFromEnv: process.env.JWT_SECRET,
    jwtSecretFromConfig: config.jwtSecret,
    vercelEnv: process.env.VERCEL,
    allEnvKeys: Object.keys(process.env).filter(key => key.includes('JWT'))
  });
});

export default router;
