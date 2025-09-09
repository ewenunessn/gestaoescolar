import { Router } from 'express';
import FaturamentoModalidadesController from '../controllers/faturamentoModalidadesController';

const router = Router();

// Rotas para modalidades disponíveis
router.get('/modalidades', FaturamentoModalidadesController.listarModalidadesDisponiveis);

// Rotas para configuração de modalidades por item
router.get('/item/:pedido_item_id/modalidades', FaturamentoModalidadesController.buscarModalidadesItem);
router.post('/item/:pedido_item_id/modalidades', FaturamentoModalidadesController.configurarModalidadesItem);

// Rotas para configuração de modalidades por pedido
router.get('/pedido/:pedido_id/itens-modalidades', FaturamentoModalidadesController.buscarItensPedidoComModalidades);
router.get('/pedido/:pedido_id/modalidades', FaturamentoModalidadesController.buscarItensPedidoComModalidades);
router.post('/pedido/:pedido_id/modalidades', FaturamentoModalidadesController.configurarModalidadesPedido);

// Rotas para cálculo de prévia
router.get('/item/:pedido_item_id/previa', FaturamentoModalidadesController.calcularPreviaItem);
router.get('/pedido/:pedido_id/previa', FaturamentoModalidadesController.calcularPreviaPedido);

// Rotas para faturamento automático
router.get('/pedidos-prontos', FaturamentoModalidadesController.listarPedidosProntosParaFaturamento);
router.get('/pedido/:pedido_id/verificar-pronto', FaturamentoModalidadesController.verificarProntoParaFaturamento);
router.post('/processar-faturamento', FaturamentoModalidadesController.processarFaturamentoAutomatico);

// Rotas para relatórios e consultas
router.get('/faturamento/:faturamento_id/relatorio', FaturamentoModalidadesController.buscarRelatorioFaturamento);
router.get('/faturamentos', FaturamentoModalidadesController.listarFaturamentosModalidades);

export default router;