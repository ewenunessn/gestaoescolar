import { Router } from 'express';
import { calcularDemandaPorCompetencia, gerarPedidosPorPeriodo, gerarGuiasDemanda, gerarPedidoDaGuia } from '../controllers/planejamentoComprasController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();
router.use(authenticateToken);

router.post('/calcular-por-competencia', calcularDemandaPorCompetencia);
router.post('/gerar-guias', gerarGuiasDemanda);
router.post('/gerar-pedidos', gerarPedidosPorPeriodo);
router.post('/gerar-pedido-da-guia', gerarPedidoDaGuia);

export default router;
