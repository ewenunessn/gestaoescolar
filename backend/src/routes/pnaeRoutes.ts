// Rotas para funcionalidades PNAE
import { Router } from 'express';
import {
  getRelatorioAgriculturaFamiliar,
  getRelatorioPerCapita,
  getValoresPerCapita,
  atualizarValorPerCapita,
  criarValorPerCapita,
  salvarRelatorio,
  listarRelatorios,
  getDashboardPNAE
} from '../controllers/pnaeController';

const router = Router();

// Dashboard
router.get('/dashboard', getDashboardPNAE);

// Relatórios
router.get('/relatorios/agricultura-familiar', getRelatorioAgriculturaFamiliar);
router.get('/relatorios/per-capita', getRelatorioPerCapita);
router.get('/relatorios', listarRelatorios);
router.post('/relatorios', salvarRelatorio);

// Valores Per Capita
router.get('/per-capita', getValoresPerCapita);
router.post('/per-capita', criarValorPerCapita);
router.put('/per-capita/:id', atualizarValorPerCapita);

export default router;
