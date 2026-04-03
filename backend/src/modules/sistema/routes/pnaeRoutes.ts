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
import { authenticateToken } from '../../../middleware/authMiddleware';
import { requireLeitura, requireEscrita } from '../../../middleware/permissionMiddleware';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas de LEITURA
router.get('/dashboard', requireLeitura('pnae'), getDashboardPNAE);
router.get('/relatorios/agricultura-familiar', requireLeitura('pnae'), getRelatorioAgriculturaFamiliar);
router.get('/relatorios/per-capita', requireLeitura('pnae'), getRelatorioPerCapita);
router.get('/relatorios', requireLeitura('pnae'), listarRelatorios);
router.get('/per-capita', requireLeitura('pnae'), getValoresPerCapita);

// Rotas de ESCRITA
router.post('/relatorios', requireEscrita('pnae'), salvarRelatorio);
router.post('/per-capita', requireEscrita('pnae'), criarValorPerCapita);
router.put('/per-capita/:id', requireEscrita('pnae'), atualizarValorPerCapita);

export default router;
