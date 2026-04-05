import { Router } from "express";
import { authenticateToken } from "../../../middleware/authMiddleware";
import {
  gerarDemandaMensal,
  gerarDemandaMultiplosCardapios,
  listarCardapiosDisponiveis,
  exportarDemandaMensal,
  exportarDemandaExcel
} from "../controllers/demandaController";

const router = Router();

// Gerar demanda (método original + múltiplos)
router.post("/gerar", authenticateToken, gerarDemandaMensal);
router.post("/gerar-multiplos", authenticateToken, gerarDemandaMultiplosCardapios);

// Exportar demanda
router.post("/exportar", authenticateToken, exportarDemandaMensal);
router.post("/exportar-excel", authenticateToken, exportarDemandaExcel);

// Leitura pública
router.get("/cardapios-disponiveis", listarCardapiosDisponiveis);

export default router;