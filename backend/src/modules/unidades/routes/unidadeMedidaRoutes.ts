import { Router } from 'express';
import * as controller from '../controllers/unidadeMedidaController';

const router = Router();

// Listar todas as unidades (com filtro opcional por tipo)
router.get('/', controller.listarUnidades);

// Converter quantidade entre unidades
router.post('/converter', controller.converterUnidades);

// Calcular fator de conversão
router.post('/calcular-fator', controller.calcularFator);

// Buscar unidade específica (deve vir por último para não conflitar)
router.get('/:identificador', controller.buscarUnidade);

export default router;
