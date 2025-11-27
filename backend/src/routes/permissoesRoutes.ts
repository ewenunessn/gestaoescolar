import { Router } from 'express';
import {
  listarModulos,
  listarNiveisPermissao,
  obterPermissoesUsuario,
  definirPermissoesUsuario,
  verificarPermissao
} from '../controllers/permissoesController';

const router = Router();

// Rotas de módulos e níveis
router.get('/modulos', listarModulos);
router.get('/niveis', listarNiveisPermissao);

// Rotas de permissões de usuário
router.get('/usuario/:usuario_id', obterPermissoesUsuario);
router.put('/usuario/:usuario_id', definirPermissoesUsuario);
router.get('/usuario/:usuario_id/modulo/:modulo_slug', verificarPermissao);

export default router;
