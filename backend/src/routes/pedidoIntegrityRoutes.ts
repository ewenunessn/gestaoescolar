import { Router } from 'express';
import { devAuthMiddleware } from '../middlewares/devAuthMiddleware';
import { validateIdParam } from '../middlewares/pedidoValidationMiddleware';
import {
  checkPedidoIntegrity,
  checkSystemIntegrity,
  autoFixPedidoIssues,
  validateBeforeSubmit,
  getIntegrityHistory,
  cleanOrphanedData,
  runIntegrityMigration,
  getPerformanceMetrics
} from '../controllers/pedidoIntegrityController';

const router = Router();

// Rotas de verificação de integridade
router.get('/system/integrity-check', devAuthMiddleware, checkSystemIntegrity);
router.get('/:id/integrity-check', devAuthMiddleware, validateIdParam('id'), checkPedidoIntegrity);

// Rotas de correção automática
router.post('/:id/auto-fix', devAuthMiddleware, validateIdParam('id'), autoFixPedidoIssues);

// Rotas de histórico
router.get('/:id/integrity-history', devAuthMiddleware, validateIdParam('id'), getIntegrityHistory);

// Rotas de validação
router.post('/validate-data', devAuthMiddleware, validateBeforeSubmit);

// Rotas de manutenção do sistema
router.post('/system/clean-orphaned', devAuthMiddleware, cleanOrphanedData);
router.post('/system/run-integrity-migration', devAuthMiddleware, runIntegrityMigration);

// Rotas de métricas
router.get('/system/performance-metrics', devAuthMiddleware, getPerformanceMetrics);

export default router;