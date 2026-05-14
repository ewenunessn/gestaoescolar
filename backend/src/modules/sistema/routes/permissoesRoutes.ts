import { Router } from 'express';
import { authenticateToken } from '../../../middleware/authMiddleware';
import { requireAdmin } from '../../../middleware/adminMiddleware';
import {
  listarModulos,
  listarNiveisPermissao,
  obterPermissoesUsuario,
  definirPermissoesUsuario,
  verificarPermissao
} from '../controllers/permissoesController';

const router = Router();

// Rotas de módulos e níveis
router.get('/modulos', authenticateToken, requireAdmin, listarModulos);
router.get('/niveis', authenticateToken, requireAdmin, listarNiveisPermissao);

// Rotas de permissões de usuário
router.get('/usuario/:usuario_id', authenticateToken, requireAdmin, obterPermissoesUsuario);
router.put('/usuario/:usuario_id', authenticateToken, requireAdmin, definirPermissoesUsuario);
router.get('/usuario/:usuario_id/modulo/:modulo_slug', authenticateToken, requireAdmin, verificarPermissao);

export default router;
