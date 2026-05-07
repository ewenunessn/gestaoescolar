import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { requireLeitura } from "../middleware/permissionMiddleware";
import { buildArchitectureOverview } from "./architectureOverview";

const router = Router();

router.get("/", authenticateToken, requireLeitura("configuracoes"), (_req, res) => {
  res.json({
    success: true,
    data: buildArchitectureOverview(),
  });
});

export default router;
