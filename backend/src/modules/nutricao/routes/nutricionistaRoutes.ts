import { Router } from 'express';
import {
  listarNutricionistas,
  buscarNutricionista,
  criarNutricionista,
  editarNutricionista,
  removerNutricionista,
  desativarNutricionista
} from '../controllers/nutricionistaController';
import { authenticateToken } from '../../../middleware/authMiddleware';
import { requireLeitura, requireEscrita } from '../../../middleware/permissionMiddleware';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas de LEITURA
router.get('/', requireLeitura('nutricionistas'), listarNutricionistas);
router.get('/:id', requireLeitura('nutricionistas'), buscarNutricionista);

// Rotas de ESCRITA
router.post('/', requireEscrita('nutricionistas'), criarNutricionista);
router.put('/:id', requireEscrita('nutricionistas'), editarNutricionista);
router.delete('/:id', requireEscrita('nutricionistas'), removerNutricionista);
router.patch('/:id/desativar', requireEscrita('nutricionistas'), desativarNutricionista);

export default router;
