import { Router } from "express";

import { authenticateToken } from "../../../middleware/authMiddleware";
import { requireLeitura } from "../../../middleware/permissionMiddleware";
import { enviarMensagemChatbot } from "../controllers/chatbotController";

const router = Router();

router.post("/message", authenticateToken, requireLeitura("estoque"), enviarMensagemChatbot);

export default router;
