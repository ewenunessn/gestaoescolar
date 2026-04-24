import { Router } from 'express';
import { authenticateToken } from "../../../middleware/authMiddleware";
import {
  listarSaldosModalidades,
  cadastrarSaldoModalidade,
  listarModalidades,
  listarProdutosContratos,
  listarResumoAlunos,
  listarResumoAlunosFinanceiro,
  registrarConsumoModalidade,
  buscarHistoricoConsumoModalidade,
  excluirConsumoModalidade
} from '../controllers/saldoContratosModalidadesController';
const router = Router();

// Listar saldos por modalidade
router.get('/', listarSaldosModalidades);

// Cadastrar/atualizar saldo por modalidade
router.post('/', authenticateToken, cadastrarSaldoModalidade);

// Registrar consumo de modalidade
router.post('/:id/consumir', authenticateToken, registrarConsumoModalidade);

// Buscar histórico de consumo de modalidade
router.get('/:id/historico', buscarHistoricoConsumoModalidade);

// Excluir consumo do histórico
router.delete('/:id/consumo/:consumoId', authenticateToken, excluirConsumoModalidade);

// Listar modalidades disponíveis
router.get('/modalidades', listarModalidades);

// Listar produtos de contratos disponíveis
router.get('/produtos-contratos', listarProdutosContratos);

// Listar resumo de alunos por modalidade
router.get('/resumo-alunos', listarResumoAlunos);

// Listar resumo de alunos consolidado pela categoria financeira
router.get('/resumo-alunos-financeiro', listarResumoAlunosFinanceiro);

export default router;
