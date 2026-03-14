import { Router } from 'express';
import { calcularDemandaPorCompetencia, gerarPedidosPorPeriodo } from '../controllers/planejamentoComprasController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();
router.use(authenticateToken);

router.post('/calcular-por-competencia', calcularDemandaPorCompetencia);
router.post('/gerar-pedidos', gerarPedidosPorPeriodo);

export default router;
