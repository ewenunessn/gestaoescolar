import { Router } from 'express';
import { authenticateToken } from '../../../middleware/authMiddleware';
import * as ctrl from '../controllers/solicitacoesAlimentosController';

const router = Router();
router.use(authenticateToken);

// Portal da escola
router.get('/minhas', ctrl.listarMinhasSolicitacoes);
router.post('/', ctrl.criarSolicitacao);
router.delete('/:id', ctrl.cancelarSolicitacao);

// Módulo principal — lista todas
router.get('/', ctrl.listarTodasSolicitacoes);

// Ações por item
router.patch('/itens/:itemId/aceitar', ctrl.aceitarItem);
router.patch('/itens/:itemId/recusar', ctrl.recusarItem);

// Aprovar todos os itens pendentes de uma solicitação
router.patch('/:id/aprovar-tudo', ctrl.aprovarTudo);

export default router;
