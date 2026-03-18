import { Router } from 'express';
import * as calendarioController from '../controllers/calendarioLetivoController';
import * as eventosController from '../controllers/eventosCalendarioController';
import * as periodosController from '../controllers/periodosAvaliativosController';

const router = Router();

// ===== ROTAS DE CALENDÁRIO LETIVO =====
router.get('/calendario-letivo', calendarioController.listarCalendariosLetivos);
router.get('/calendario-letivo/ativo', calendarioController.buscarCalendarioLetivoAtivo);
router.get('/calendario-letivo/periodo/:periodo_id', calendarioController.buscarCalendarioPorPeriodo);
router.get('/calendario-letivo/:id', calendarioController.buscarCalendarioLetivo);
router.post('/calendario-letivo', calendarioController.criarCalendarioLetivo);
router.put('/calendario-letivo/:id', calendarioController.atualizarCalendarioLetivo);
router.delete('/calendario-letivo/:id', calendarioController.excluirCalendarioLetivo);
router.get('/calendario-letivo/:id/dias-letivos', calendarioController.calcularDiasLetivos);

// ===== ROTAS DE EVENTOS =====
router.get('/calendario-letivo/:calendario_id/eventos', eventosController.listarEventos);
router.get('/calendario-letivo/:calendario_id/eventos/:ano/:mes', eventosController.listarEventosPorMes);
router.get('/eventos/:id', eventosController.buscarEvento);
router.post('/eventos', eventosController.criarEvento);
router.put('/eventos/:id', eventosController.atualizarEvento);
router.delete('/eventos/:id', eventosController.excluirEvento);
router.post('/eventos/importar-feriados', eventosController.importarFeriadosNacionais);

// ===== ROTAS DE PERÍODOS AVALIATIVOS =====
router.get('/calendario-letivo/:calendario_id/periodos', periodosController.listarPeriodos);
router.post('/periodos', periodosController.criarPeriodo);
router.put('/periodos/:id', periodosController.atualizarPeriodo);
router.delete('/periodos/:id', periodosController.excluirPeriodo);
router.post('/calendario-letivo/:calendario_id/periodos/gerar', periodosController.gerarPeriodosAutomaticamente);

// ===== ROTAS DE EXCEÇÕES DE DIAS LETIVOS =====
router.get('/calendario-letivo/:calendario_id/excecoes', periodosController.listarExcecoes);
router.post('/excecoes', periodosController.criarExcecao);
router.delete('/excecoes/:id', periodosController.excluirExcecao);

export default router;
