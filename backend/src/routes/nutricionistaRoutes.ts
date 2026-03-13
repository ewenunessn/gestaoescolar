import { Router } from 'express';
import {
  listarNutricionistas,
  buscarNutricionista,
  criarNutricionista,
  editarNutricionista,
  removerNutricionista,
  desativarNutricionista
} from '../controllers/nutricionistaController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Rotas de nutricionistas
router.get('/', authenticateToken, listarNutricionistas);
router.get('/:id', authenticateToken, buscarNutricionista);
router.post('/', authenticateToken, criarNutricionista);
router.put('/:id', authenticateToken, editarNutricionista);
router.delete('/:id', authenticateToken, removerNutricionista);
router.patch('/:id/desativar', authenticateToken, desativarNutricionista);

export default router;
