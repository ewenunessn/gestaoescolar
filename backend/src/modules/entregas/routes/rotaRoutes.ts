import { NextFunction, Request, Response, Router } from 'express';
import RotaController from '../controllers/RotaController';
import { authenticateToken } from '../../../middleware/authMiddleware';
import { requireEscrita, requireLeitura } from '../../../middleware/permissionMiddleware';

const router = Router();
const rotasRead = requireLeitura('rotas');
const rotasWrite = requireEscrita('rotas');

export function requireRotasRead(req: Request, res: Response, next: NextFunction) {
  return rotasRead(req, res, next);
}

export function requireRotasWrite(req: Request, res: Response, next: NextFunction) {
  return rotasWrite(req, res, next);
}

router.get('/rotas', authenticateToken, requireRotasRead, RotaController.listarRotas);
router.post('/rotas', authenticateToken, requireRotasWrite, RotaController.criarRota);
router.get('/rotas/:id', authenticateToken, requireRotasRead, RotaController.buscarRota);
router.put('/rotas/:id', authenticateToken, requireRotasWrite, RotaController.atualizarRota);
router.delete('/rotas/:id', authenticateToken, requireRotasWrite, RotaController.deletarRota);

router.get('/rotas/:rotaId/escolas', authenticateToken, requireRotasRead, RotaController.listarEscolasRota);
router.post('/rotas/:rotaId/escolas', authenticateToken, requireRotasWrite, RotaController.adicionarEscolaRota);
router.delete('/rotas/:rotaId/escolas/:escolaId', authenticateToken, requireRotasWrite, RotaController.removerEscolaRota);
router.put('/rotas/:rotaId/escolas/ordem', authenticateToken, requireRotasWrite, RotaController.atualizarOrdemEscolas);

router.get('/planejamentos', authenticateToken, requireRotasRead, RotaController.listarPlanejamentos);
router.post('/planejamentos', authenticateToken, requireRotasWrite, RotaController.criarPlanejamento);
router.post('/planejamentos-avancado', authenticateToken, requireRotasWrite, RotaController.criarPlanejamentoAvancado);
router.put('/planejamentos/:id', authenticateToken, requireRotasWrite, RotaController.atualizarPlanejamento);
router.delete('/planejamentos/:id', authenticateToken, requireRotasWrite, RotaController.deletarPlanejamento);
router.get('/planejamentos/:id/escolas-status', authenticateToken, requireRotasRead, RotaController.listarStatusEscolasPlanejamento);
router.put('/planejamentos/:id/escolas/:escolaId/status', authenticateToken, requireRotasWrite, RotaController.atualizarStatusEscola);
router.get('/evidencias', authenticateToken, requireRotasRead, RotaController.listarEvidencias);

router.get('/escolas-disponiveis', authenticateToken, requireRotasRead, RotaController.listarEscolasDisponiveis);
router.get('/escolas/:escolaId/verificar-rota', authenticateToken, requireRotasRead, RotaController.verificarEscolaEmRota);

export default router;
