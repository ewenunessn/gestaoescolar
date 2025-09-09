import { Router } from 'express';
import { devAuthMiddleware } from '../middlewares/devAuthMiddleware';
import {
  validateIdParam,
  sanitizeInput,
  logPedidoOperation,
  checkPedidoPermissions
} from '../middlewares/pedidoValidationMiddleware';
import {
  initPedidoModerno,
  criarPedido,
  listarPedidos,
  buscarPedido,
  atualizarStatus,
  buscarHistorico,
  cancelarPedido,
  atualizarDataEntrega,
  atualizarDatasEntrega,
  atualizarObservacoes,
  confirmarPedido,
  validarIntegridade,
  recalcularEstatisticas,
  excluirPedido,
  excluirPedidosLoteController,
  verificarExclusao,
  limparOrfaos,
  buscarStatusItensPedidoDetalhado
} from '../controllers/pedidoModernoController';

// Importar rotas de integridade
import pedidoIntegrityRoutes from './pedidoIntegrityRoutes';

const router = Router();

// Aplicar middlewares globais (exceto autenticação)
router.use(sanitizeInput);
router.use(logPedidoOperation);

// Rota de teste simples (sem autenticação)
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: "Rotas de pedidos funcionando!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rota de teste para listar pedidos (sem autenticação)
router.get('/test-list', async (req, res) => {
  try {
    const db = require("../database");
    
    // Testar se a tabela existe
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pedidos'
      );
    `);

    if (!tableExists.rows[0].exists) {
      return res.json({
        success: false,
        message: "Tabela pedidos não existe",
        suggestion: "Execute a migração de integridade primeiro"
      });
    }

    // Tentar buscar pedidos
    const pedidos = await db.query(`
      SELECT 
        id,
        numero_pedido,
        status,
        valor_total,
        data_criacao
      FROM pedidos 
      ORDER BY data_criacao DESC 
      LIMIT 5
    `);

    res.json({
      success: true,
      message: "Teste de listagem de pedidos",
      data: pedidos.rows,
      total: pedidos.rows.length
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro ao testar listagem de pedidos",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Rota para inicializar o sistema (executar uma vez)
router.post('/init', devAuthMiddleware, initPedidoModerno);

// Rotas principais do sistema de pedidos
router.post('/', devAuthMiddleware, criarPedido);
router.get('/', devAuthMiddleware, listarPedidos);
router.get('/:id', devAuthMiddleware, validateIdParam('id'), buscarPedido);
router.get('/:id/status-itens', devAuthMiddleware, validateIdParam('id'), buscarStatusItensPedidoDetalhado);
router.put('/:id/status', devAuthMiddleware, validateIdParam('id'), atualizarStatus);
router.get('/:id/historico', devAuthMiddleware, validateIdParam('id'), buscarHistorico);
router.put('/:id/cancelar', devAuthMiddleware, validateIdParam('id'), cancelarPedido);

// Rotas para gerenciar datas de entrega dos itens
router.put('/itens/:id/data-entrega', devAuthMiddleware, checkPedidoPermissions, validateIdParam('id'), atualizarDataEntrega);
router.put('/itens/datas-entrega', devAuthMiddleware, checkPedidoPermissions, atualizarDatasEntrega);

// Rotas para edição de pedidos
router.put('/:id/observacoes', devAuthMiddleware, checkPedidoPermissions, validateIdParam('id'), atualizarObservacoes);
router.put('/:id/confirmar', devAuthMiddleware, checkPedidoPermissions, validateIdParam('id'), confirmarPedido);

// Rotas para exclusão de pedidos
router.get('/:id/verificar-exclusao', devAuthMiddleware, checkPedidoPermissions, validateIdParam('id'), verificarExclusao);
router.delete('/:id', devAuthMiddleware, checkPedidoPermissions, validateIdParam('id'), excluirPedido);
router.delete('/lote/excluir', devAuthMiddleware, checkPedidoPermissions, excluirPedidosLoteController);

// Rotas para manutenção e validação
router.get('/admin/validar-integridade', devAuthMiddleware, validarIntegridade);
router.put('/:id/recalcular-estatisticas', devAuthMiddleware, checkPedidoPermissions, validateIdParam('id'), recalcularEstatisticas);
router.post('/admin/limpar-orfaos', devAuthMiddleware, limparOrfaos);

// Incluir rotas de integridade
router.use('/', pedidoIntegrityRoutes);

export default router;