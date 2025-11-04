/**
 * Tenant Migration Routes
 * API routes for managing tenant migrations
 */

import { Router } from 'express';
import { tenantMigrationController } from '../controllers/tenantMigrationController';

const router = Router();

// Migration status and information
router.get('/status', tenantMigrationController.getMigrationStatus.bind(tenantMigrationController));
router.get('/definition/:migrationId', tenantMigrationController.getMigrationDefinition.bind(tenantMigrationController));
router.get('/templates', tenantMigrationController.getTemplates.bind(tenantMigrationController));

// Migration execution
router.post('/run', tenantMigrationController.runMigrations.bind(tenantMigrationController));
router.post('/rollback', tenantMigrationController.rollbackMigrations.bind(tenantMigrationController));
router.post('/recover', tenantMigrationController.recoverMigration.bind(tenantMigrationController));

// Migration creation and management
router.post('/create', tenantMigrationController.createMigration.bind(tenantMigrationController));
router.post('/generate', tenantMigrationController.generateFromTemplate.bind(tenantMigrationController));

// Tenant-specific operations
router.post('/tenant/:tenantId/run', tenantMigrationController.runTenantMigrations.bind(tenantMigrationController));

// Validation
router.get('/validate', tenantMigrationController.validateIntegrity.bind(tenantMigrationController));

export default router;