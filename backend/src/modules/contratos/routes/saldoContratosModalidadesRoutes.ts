import { Router } from 'express';
import {
  listarSaldosModalidades,
  listarModalidades,
  listarProdutosContratos,
  cadastrarSaldoModalidade,
  registrarConsumoModalidade,
  buscarHistoricoConsumoModalidade,
  excluirConsumoModalidade
} from '../controllers/saldoContratosModalidadesController';
import { requireTenant } from '../../../middleware/tenantMiddleware';

const router = Router();

// Aplicar middleware de tenant para todas as rotas
router.use(requireTenant());

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

// Excluir registro de consumo por modalidade
router.delete('/:id/consumo/:consumoId', excluirConsumoModalidade);

export default router;