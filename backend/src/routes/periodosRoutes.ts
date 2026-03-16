import { Router } from 'express';
import {
  listarPeriodos,
  obterPeriodoAtivo,
  criarPeriodo,
  atualizarPeriodo,
  ativarPeriodo,
  fecharPeriodo,
  reabrirPeriodo,
  deletarPeriodo
} from '../controllers/periodosController';

const router = Router();

// Listar todos os períodos
router.get('/', listarPeriodos);

// Obter período ativo
router.get('/ativo', obterPeriodoAtivo);

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
