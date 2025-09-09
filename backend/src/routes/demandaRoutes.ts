import { Router } from "express";
import { 
  gerarDemandaMensal,
  gerarDemandaMultiplosCardapios,
  listarCardapiosDisponiveis,
  exportarDemandaMensal,
  exportarDemandaExcel
} from "../controllers/demandaController";

const router = Router();

// Gerar demanda mensal (método original)
router.post("/gerar", gerarDemandaMensal);

// Gerar demanda com múltiplos cardápios
router.post("/gerar-multiplos", gerarDemandaMultiplosCardapios);

// Listar cardápios disponíveis para seleção
router.get("/cardapios-disponiveis", listarCardapiosDisponiveis);

// Exportar demanda mensal
router.post("/exportar", exportarDemandaMensal);

// Exportar demanda para Excel
router.post("/exportar-excel", exportarDemandaExcel);

export default router;