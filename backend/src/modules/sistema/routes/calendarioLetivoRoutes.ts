import { Router } from 'express';
import { authenticateToken } from '../../../middleware/authMiddleware';
import * as calendarioController from '../controllers/calendarioLetivoController';
import * as eventosController from '../controllers/eventosCalendarioController';
import * as periodosController from '../controllers/periodosAvaliativosController';

const router = Router();

// ===== ROTAS DE CALENDÁRIO LETIVO =====
router.get('/calendario-letivo', calendarioController.listarCalendariosLetivos);
router.get('/calendario-letivo/ativo', calendarioController.buscarCalendarioLetivoAtivo);
router.get('/calendario-letivo/periodo/:periodo_id', calendarioController.buscarCalendarioPorPeriodo);
router.get('/calendario-letivo/:id', calendarioController.buscarCalendarioLetivo);
router.get('/calendario-letivo/:id/dias-letivos', calendarioController.calcularDiasLetivos);
// Escrita protegida
router.post('/calendario-letivo', authenticateToken, calendarioController.criarCalendarioLetivo);
router.put('/calendario-letivo/:id', authenticateToken, calendarioController.atualizarCalendarioLetivo);
router.delete('/calendario-letivo/:id', authenticateToken, calendarioController.excluirCalendarioLetivo);

// ===== ROTAS DE EVENTOS =====
router.get('/calendario-letivo/:calendario_id/eventos', eventosController.listarEventos);
router.get('/calendario-letivo/:calendario_id/eventos/:ano/:mes', eventosController.listarEventosPorMes);
router.get('/eventos/:id', eventosController.buscarEvento);
// Escrita protegida
router.post('/eventos', authenticateToken, eventosController.criarEvento);
router.put('/eventos/:id', authenticateToken, eventosController.atualizarEvento);
router.delete('/eventos/:id', authenticateToken, eventosController.excluirEvento);
router.post('/eventos/importar-feriados', authenticateToken, eventosController.importarFeriadosNacionais);

// ===== ROTAS DE PERÍODOS AVALIATIVOS =====
router.get('/calendario-letivo/:calendario_id/periodos', periodosController.listarPeriodos);
// Escrita protegida
router.post('/periodos', authenticateToken, periodosController.criarPeriodo);
router.put('/periodos/:id', authenticateToken, periodosController.atualizarPeriodo);
router.delete('/periodos/:id', authenticateToken, periodosController.excluirPeriodo);
router.post('/calendario-letivo/:calendario_id/periodos/gerar', authenticateToken, periodosController.gerarPeriodosAutomaticamente);

// ===== ROTAS DE EXCEÇÕES DE DIAS LETIVOS =====
router.get('/calendario-letivo/:calendario_id/excecoes', periodosController.listarExcecoes);
// Escrita protegida
router.post('/excecoes', authenticateToken, periodosController.criarExcecao);
router.delete('/excecoes/:id', authenticateToken, periodosController.excluirExcecao);

export default router;
