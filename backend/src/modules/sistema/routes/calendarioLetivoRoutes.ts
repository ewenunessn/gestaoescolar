import { NextFunction, Request, Response, Router } from 'express';
import { authenticateToken } from '../../../middleware/authMiddleware';
import { requireEscrita, requireLeitura } from '../../../middleware/permissionMiddleware';
import * as calendarioController from '../controllers/calendarioLetivoController';
import * as eventosController from '../controllers/eventosCalendarioController';
import * as periodosController from '../controllers/periodosAvaliativosController';

const router = Router();
const calendarioRead = requireLeitura('calendario');
const calendarioWrite = requireEscrita('calendario');

export function requireCalendarioRead(req: Request, res: Response, next: NextFunction) {
  return calendarioRead(req, res, next);
}

export function requireCalendarioWrite(req: Request, res: Response, next: NextFunction) {
  return calendarioWrite(req, res, next);
}

// ===== ROTAS DE CALENDARIO LETIVO =====
router.get('/calendario-letivo', authenticateToken, requireCalendarioRead, calendarioController.listarCalendariosLetivos);
router.get('/calendario-letivo/ativo', authenticateToken, requireCalendarioRead, calendarioController.buscarCalendarioLetivoAtivo);
router.get('/calendario-letivo/periodo/:periodo_id', authenticateToken, requireCalendarioRead, calendarioController.buscarCalendarioPorPeriodo);
router.get('/calendario-letivo/:id', authenticateToken, requireCalendarioRead, calendarioController.buscarCalendarioLetivo);
router.get('/calendario-letivo/:id/dias-letivos', authenticateToken, requireCalendarioRead, calendarioController.calcularDiasLetivos);
router.post('/calendario-letivo', authenticateToken, requireCalendarioWrite, calendarioController.criarCalendarioLetivo);
router.put('/calendario-letivo/:id', authenticateToken, requireCalendarioWrite, calendarioController.atualizarCalendarioLetivo);
router.delete('/calendario-letivo/:id', authenticateToken, requireCalendarioWrite, calendarioController.excluirCalendarioLetivo);

// ===== ROTAS DE EVENTOS =====
router.get('/calendario-letivo/:calendario_id/eventos', authenticateToken, requireCalendarioRead, eventosController.listarEventos);
router.get('/calendario-letivo/:calendario_id/eventos/:ano/:mes', authenticateToken, requireCalendarioRead, eventosController.listarEventosPorMes);
router.get('/eventos/:id', authenticateToken, requireCalendarioRead, eventosController.buscarEvento);
router.post('/eventos', authenticateToken, requireCalendarioWrite, eventosController.criarEvento);
router.put('/eventos/:id', authenticateToken, requireCalendarioWrite, eventosController.atualizarEvento);
router.delete('/eventos/:id', authenticateToken, requireCalendarioWrite, eventosController.excluirEvento);
router.post('/eventos/importar-feriados', authenticateToken, requireCalendarioWrite, eventosController.importarFeriadosNacionais);

// ===== ROTAS DE PERIODOS AVALIATIVOS =====
router.get('/calendario-letivo/:calendario_id/periodos', authenticateToken, requireCalendarioRead, periodosController.listarPeriodos);
router.post('/periodos', authenticateToken, requireCalendarioWrite, periodosController.criarPeriodo);
router.put('/periodos/:id', authenticateToken, requireCalendarioWrite, periodosController.atualizarPeriodo);
router.delete('/periodos/:id', authenticateToken, requireCalendarioWrite, periodosController.excluirPeriodo);
router.post('/calendario-letivo/:calendario_id/periodos/gerar', authenticateToken, requireCalendarioWrite, periodosController.gerarPeriodosAutomaticamente);

// ===== ROTAS DE EXCECOES DE DIAS LETIVOS =====
router.get('/calendario-letivo/:calendario_id/excecoes', authenticateToken, requireCalendarioRead, periodosController.listarExcecoes);
router.post('/excecoes', authenticateToken, requireCalendarioWrite, periodosController.criarExcecao);
router.delete('/excecoes/:id', authenticateToken, requireCalendarioWrite, periodosController.excluirExcecao);

export default router;
