import { Router } from 'express';
import * as faturamentoController from '../controllers/faturamentoController';

const router = Router();

// Criar faturamento
router.post('/', faturamentoController.criarFaturamento);

// Listar faturamentos de um pedido
router.get('/pedido/:pedidoId', faturamentoController.listarFaturamentosPedido);

// Buscar resumo de faturamento por modalidades de um pedido
router.get('/pedido/:pedidoId/resumo', faturamentoController.resumoFaturamentoPedido);

// Buscar detalhes de um faturamento específico
router.get('/:id', faturamentoController.buscarFaturamento);

// Atualizar faturamento
router.put('/:id', faturamentoController.atualizarFaturamento);

// Deletar faturamento
router.delete('/:id', faturamentoController.deletarFaturamento);

export default router;
