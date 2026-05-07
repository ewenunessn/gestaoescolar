import type { Response } from "express";

import { AuthenticatedRequest } from "../../../middleware/authMiddleware";
import { loadChatbotConfig } from "../config/chatbotConfig";
import { createChatbotResponse } from "../services/chatbotOrchestrator";

export async function enviarMensagemChatbot(req: AuthenticatedRequest, res: Response) {
  try {
    const config = loadChatbotConfig();
    const result = await createChatbotResponse({
      message: String(req.body?.message || ""),
      history: Array.isArray(req.body?.history) ? req.body.history : [],
      config,
    });

    return res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message === "Chatbot desativado") {
      return res.status(503).json({
        success: false,
        message: "Chatbot desativado por configuracao.",
      });
    }

    if (error.message === "Mensagem vazia" || error.message === "Mensagem muito longa") {
      return res.status(400).json({ success: false, message: error.message });
    }

    console.error("[chatbot] erro ao processar mensagem:", error);
    return res.status(500).json({
      success: false,
      message: "Nao foi possivel processar a mensagem do chatbot.",
    });
  }
}
