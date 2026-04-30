import { NextFunction, Request, Response, Router } from 'express';
import { authenticateToken } from "../../../middleware/authMiddleware";
import { requireEscrita, requireLeitura } from "../../../middleware/permissionMiddleware";
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
const saldoContratosRead = requireLeitura("saldo_contratos");
const saldoContratosWrite = requireEscrita("saldo_contratos");

export function requireSaldoContratosRead(req: Request, res: Response, next: NextFunction) {
  return saldoContratosRead(req, res, next);
}

export function requireSaldoContratosWrite(req: Request, res: Response, next: NextFunction) {
  return saldoContratosWrite(req, res, next);
}

// Listar saldos por modalidade
router.get('/', authenticateToken, requireSaldoContratosRead, listarSaldosModalidades);

// Cadastrar/atualizar saldo por modalidade
router.post('/', authenticateToken, requireSaldoContratosWrite, cadastrarSaldoModalidade);

// Registrar consumo de modalidade
router.post('/:id/consumir', authenticateToken, requireSaldoContratosWrite, registrarConsumoModalidade);

// Buscar histórico de consumo de modalidade
router.get('/:id/historico', authenticateToken, requireSaldoContratosRead, buscarHistoricoConsumoModalidade);

// Excluir consumo do histórico
router.delete('/:id/consumo/:consumoId', authenticateToken, requireSaldoContratosWrite, excluirConsumoModalidade);

// Listar modalidades disponíveis
router.get('/modalidades', authenticateToken, requireSaldoContratosRead, listarModalidades);

// Listar produtos de contratos disponíveis
router.get('/produtos-contratos', authenticateToken, requireSaldoContratosRead, listarProdutosContratos);

// Listar resumo de alunos por modalidade
router.get('/resumo-alunos', authenticateToken, requireSaldoContratosRead, listarResumoAlunos);

// Listar resumo de alunos consolidado pela categoria financeira
router.get('/resumo-alunos-financeiro', authenticateToken, requireSaldoContratosRead, listarResumoAlunosFinanceiro);

export default router;
