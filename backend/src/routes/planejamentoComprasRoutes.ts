import { Router } from 'express';
import { 
  calcularDemandaPorCompetencia, 
  gerarPedidosPorPeriodo, 
  gerarGuiasDemanda, 
  gerarPedidoDaGuia,
  iniciarGeracaoGuias,
  iniciarGeracaoPedido,
  buscarStatusJob,
  listarJobsUsuario
} from '../controllers/planejamentoComprasController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();
router.use(authenticateToken);

router.post('/calcular-por-competencia', calcularDemandaPorCompetencia);
router.post('/gerar-guias', gerarGuiasDemanda); // Mantém rota síncrona
router.post('/gerar-guias-async', iniciarGeracaoGuias); // Nova rota assíncrona
router.post('/gerar-pedido-da-guia', gerarPedidoDaGuia); // Mantém rota síncrona
router.post('/gerar-pedido-da-guia-async', iniciarGeracaoPedido); // Nova rota assíncrona
router.get('/jobs/:id', buscarStatusJob);
router.get('/jobs', listarJobsUsuario);
router.post('/gerar-pedidos', gerarPedidosPorPeriodo);

export default router;
