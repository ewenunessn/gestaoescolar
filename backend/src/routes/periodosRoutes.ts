import { Router } from 'express';
import {
  listarPeriodos,
  obterPeriodoAtivo,
  criarPeriodo,
  atualizarPeriodo,
  ativarPeriodo,
  fecharPeriodo,
  reabrirPeriodo,
  deletarPeriodo,
  selecionarPeriodoUsuario
} from '../controllers/periodosController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Listar todos os períodos
router.get('/', listarPeriodos);

// Obter período ativo (ou período do usuário)
router.get('/ativo', obterPeriodoAtivo);

// Selecionar período do usuário
router.post('/selecionar', selecionarPeriodoUsuario);

// Criar novo período
router.post('/', criarPeriodo);

// Atualizar período
router.put('/:id', atualizarPeriodo);

// Ativar período
router.patch('/:id/ativar', ativarPeriodo);

// Fechar período
router.patch('/:id/fechar', fecharPeriodo);

// Reabrir período
router.patch('/:id/reabrir', reabrirPeriodo);

// Deletar período
router.delete('/:id', deletarPeriodo);

export default router;
