import { NextFunction, Request, Response, Router } from 'express';
import {
  calcularDemandaPorCompetencia,
  gerarPedidosPorPeriodo,
  gerarGuiasDemanda,
  gerarPedidoDaGuia,
  iniciarGeracaoGuias,
  iniciarGeracaoPedido,
  buscarStatusJob,
  listarJobsUsuario
} from '../controllers/planejamentoComprasController';
import { authenticateToken } from '../../../middleware/authMiddleware';
import { requireEscrita, requireLeitura } from '../../../middleware/permissionMiddleware';

const router = Router();
const guiasRead = requireLeitura('guias');
const guiasWrite = requireEscrita('guias');
const comprasRead = requireLeitura('compras');
const comprasWrite = requireEscrita('compras');

export function requireGuiasRead(req: Request, res: Response, next: NextFunction) {
  return guiasRead(req, res, next);
}

export function requireGuiasWrite(req: Request, res: Response, next: NextFunction) {
  return guiasWrite(req, res, next);
}

export function requireComprasRead(req: Request, res: Response, next: NextFunction) {
  return comprasRead(req, res, next);
}

export function requireComprasWrite(req: Request, res: Response, next: NextFunction) {
  return comprasWrite(req, res, next);
}

router.post('/calcular-por-competencia', authenticateToken, requireGuiasRead, calcularDemandaPorCompetencia);
router.post('/gerar-guias', authenticateToken, requireGuiasWrite, gerarGuiasDemanda);
router.post('/gerar-guias-async', authenticateToken, requireGuiasWrite, iniciarGeracaoGuias);
router.post('/gerar-pedido-da-guia', authenticateToken, requireComprasWrite, gerarPedidoDaGuia);
router.post('/gerar-pedido-da-guia-async', authenticateToken, requireComprasWrite, iniciarGeracaoPedido);
router.get('/jobs/:id', authenticateToken, requireComprasRead, buscarStatusJob);
router.get('/jobs', authenticateToken, requireComprasRead, listarJobsUsuario);
router.post('/gerar-pedidos', authenticateToken, requireComprasWrite, gerarPedidosPorPeriodo);

export default router;
