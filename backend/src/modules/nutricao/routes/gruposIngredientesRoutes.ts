import { Router } from 'express';
import { authenticateToken } from '../../../middleware/authMiddleware';
import {
  listarGrupos,
  criarGrupo,
  atualizarGrupo,
  excluirGrupo,
  salvarItensGrupo,
} from '../controllers/gruposIngredientesController';

const router = Router();
router.use(authenticateToken);

router.get('/', listarGrupos);
router.post('/', criarGrupo);
router.put('/:id', atualizarGrupo);
router.delete('/:id', excluirGrupo);
router.put('/:id/itens', salvarItensGrupo);

export default router;
