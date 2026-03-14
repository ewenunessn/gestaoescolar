import { Router } from 'express';
import { calcularDemandaPorCompetencia } from '../controllers/planejamentoComprasController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// POST /api/planejamento-compras/calcular-por-competencia
router.post('/calcular-por-competencia', calcularDemandaPorCompetencia);

export default router;
