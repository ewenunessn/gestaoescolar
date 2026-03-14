import { Router } from 'express';
import {
  calcularValoresNutricionais,
  calcularCusto,
  aplicarCalculosAutomaticos
} from '../controllers/refeicaoCalculosController';
import { buscarIngredientesDetalhados } from '../controllers/refeicaoIngredientesController';

const router = Router();

// Calcular valores nutricionais de uma refeição
router.post('/refeicoes/:id/calcular-nutricional', calcularValoresNutricionais);

// Calcular custo de uma refeição
router.post('/refeicoes/:id/calcular-custo', calcularCusto);

// Aplicar cálculos automáticos (nutricional + custo) e salvar na refeição
router.post('/refeicoes/:id/aplicar-calculos', aplicarCalculosAutomaticos);

// Buscar ingredientes com composição nutricional detalhada (para PDF)
router.get('/refeicoes/:id/ingredientes-detalhados', buscarIngredientesDetalhados);

export default router;
