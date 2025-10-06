import { Router } from 'express';
import {
  listarSaldosModalidades,
  listarModalidades,
  listarProdutosContratos,
  cadastrarSaldoModalidade,
  registrarConsumoModalidade,
  buscarHistoricoConsumoModalidade
} from '../controllers/saldoContratosModalidadesController';

const router = Router();

// Listar saldos por modalidade
router.get('/', listarSaldosModalidades);

// Listar modalidades disponíveis
router.get('/modalidades', listarModalidades);

// Listar produtos de contratos disponíveis
router.get('/produtos-contratos', listarProdutosContratos);

// Cadastrar/atualizar saldo por modalidade
router.post('/', cadastrarSaldoModalidade);

// Registrar consumo por modalidade
router.post('/:id/consumir', registrarConsumoModalidade);

// Buscar histórico de consumos por modalidade
router.get('/:id/historico', buscarHistoricoConsumoModalidade);

export default router;