import { Router } from 'express';
import RotaController from '../controllers/RotaController';

const router = Router();

// Rotas de Entrega
router.get('/rotas', RotaController.listarRotas);
router.post('/rotas', RotaController.criarRota);
router.get('/rotas/:id', RotaController.buscarRota);
router.put('/rotas/:id', RotaController.atualizarRota);
router.delete('/rotas/:id', RotaController.deletarRota);

// Escolas da Rota
router.get('/rotas/:rotaId/escolas', RotaController.listarEscolasRota);
router.get('/escolas-filtradas', RotaController.listarEscolasFiltradas);
router.post('/rotas/:rotaId/escolas', RotaController.adicionarEscolaRota);
router.delete('/rotas/:rotaId/escolas/:escolaId', RotaController.removerEscolaRota);
router.put('/rotas/:rotaId/escolas/ordem', RotaController.atualizarOrdemEscolas);

// Planejamento de Entregas
router.get('/planejamentos', RotaController.listarPlanejamentos);
router.post('/planejamentos', RotaController.criarPlanejamento);
router.post('/planejamentos-avancado', RotaController.criarPlanejamentoAvancado);
router.put('/planejamentos/:id', RotaController.atualizarPlanejamento);
router.delete('/planejamentos/:id', RotaController.deletarPlanejamento);

// Escolas disponíveis
router.get('/escolas-disponiveis', RotaController.listarEscolasDisponiveis);
router.get('/escolas/:escolaId/verificar-rota', RotaController.verificarEscolaEmRota);

// Para o módulo de entregas
router.get('/rotas-entregas', RotaController.listarRotasComEntregas);
router.get('/rotas-filtradas', RotaController.listarRotasFiltradas);

// Configuração de Entrega
router.get('/configuracao-ativa', RotaController.buscarConfiguracaoAtiva);
router.post('/configuracao', RotaController.salvarConfiguracao);
router.get('/configuracoes', RotaController.listarConfiguracoes);

export default router;