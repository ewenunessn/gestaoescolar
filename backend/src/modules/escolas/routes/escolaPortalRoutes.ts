import { Router } from 'express';
import * as escolaPortalController from '../controllers/escolaPortalController';
import { authenticateToken } from '../../../middleware/authMiddleware';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Dashboard da escola
router.get('/dashboard', escolaPortalController.getDashboardEscola);

// Debug: verificar token
router.get('/debug-token', (req: any, res) => {
  res.json({
    success: true,
    user: req.user,
    message: 'Token decodificado com sucesso'
  });
});

// Guias da escola
router.get('/guias', escolaPortalController.getGuiasEscola);

// Itens de uma guia específica
router.get('/guias/:guiaId/itens', escolaPortalController.getItensGuiaEscola);

// Cardápios da semana atual
router.get('/cardapios-semana', escolaPortalController.getCardapiosSemana);

export default router;
