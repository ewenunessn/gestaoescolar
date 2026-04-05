import { Router } from 'express';
import { authenticateToken } from '../../../middleware/authMiddleware';
import {
  calcularValoresNutricionais,
  calcularCusto,
  aplicarCalculosAutomaticos
} from '../controllers/refeicaoCalculosController';
import { buscarIngredientesDetalhados } from '../controllers/refeicaoIngredientesController';

const router = Router();

// Calcular valores nutricionais/custo (protegido — operações pesadas)
router.post('/refeicoes/:id/calcular-nutricional', authenticateToken, calcularValoresNutricionais);
router.post('/refeicoes/:id/calcular-custo', authenticateToken, calcularCusto);
router.post('/refeicoes/:id/aplicar-calculos', authenticateToken, aplicarCalculosAutomaticos);

// Leitura pública
router.get('/refeicoes/:id/ingredientes-detalhados', buscarIngredientesDetalhados);

export default router;
