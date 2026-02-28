import { Router } from 'express';
import RotaController from '../controllers/RotaController';
import { authenticateToken, optionalAuth } from '../../../middleware/authMiddleware';

const router = Router();

// Rotas de Entrega
router.get('/rotas', optionalAuth, RotaController.listarRotas);
router.post('/rotas', authenticateToken, RotaController.criarRota);
router.get('/rotas/:id', optionalAuth, RotaController.buscarRota);
router.put('/rotas/:id', authenticateToken, RotaController.atualizarRota);
router.delete('/rotas/:id', authenticateToken, RotaController.deletarRota);

// Escolas da Rota
router.get('/rotas/:rotaId/escolas', optionalAuth, RotaController.listarEscolasRota);
router.post('/rotas/:rotaId/escolas', authenticateToken, RotaController.adicionarEscolaRota);
router.delete('/rotas/:rotaId/escolas/:escolaId', authenticateToken, RotaController.removerEscolaRota);
router.put('/rotas/:rotaId/escolas/ordem', authenticateToken, RotaController.atualizarOrdemEscolas);

// Planejamento de Entregas
router.get('/planejamentos', optionalAuth, RotaController.listarPlanejamentos);
router.post('/planejamentos', authenticateToken, RotaController.criarPlanejamento);
router.post('/planejamentos-avancado', authenticateToken, RotaController.criarPlanejamentoAvancado);
router.put('/planejamentos/:id', authenticateToken, RotaController.atualizarPlanejamento);
router.delete('/planejamentos/:id', authenticateToken, RotaController.deletarPlanejamento);
router.get('/planejamentos/:id/escolas-status', optionalAuth, RotaController.listarStatusEscolasPlanejamento);
router.put('/planejamentos/:id/escolas/:escolaId/status', authenticateToken, RotaController.atualizarStatusEscola);
router.get('/evidencias', optionalAuth, RotaController.listarEvidencias);

// Escolas disponíveis
router.get('/escolas-disponiveis', RotaController.listarEscolasDisponiveis);
router.get('/escolas/:escolaId/verificar-rota', RotaController.verificarEscolaEmRota);



export default router;
