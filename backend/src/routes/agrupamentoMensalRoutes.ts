import { Router } from 'express';
import {
  listarAgrupamentosMensais,
  obterAgrupamentoMensal,
  criarAgrupamentoMensal,
  adicionarPedidoAgrupamento,
  listarPedidosPendentesAgrupamento
} from '../controllers/agrupamentoMensalController';

const router = Router();

// Rotas para agrupamentos mensais
router.get('/', listarAgrupamentosMensais);
router.get('/pendentes', listarPedidosPendentesAgrupamento);
router.get('/:id', obterAgrupamentoMensal);
router.post('/', criarAgrupamentoMensal);
router.post('/adicionar-pedido', adicionarPedidoAgrupamento);


export default router;