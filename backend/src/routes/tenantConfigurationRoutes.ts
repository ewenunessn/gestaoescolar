/**
 * Tenant configuration routes
 * API routes for tenant configuration management
 */

import { Router } from 'express';
import { tenantConfigurationController } from '../controllers/tenantConfigurationController';
import { requireAuth, requireTenantAdmin } from '../middlewares/tenantAuthMiddleware';
import { requireTenant } from '../middleware/tenantMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(requireAuth());

// Tenant-specific configuration routes
router.get('/tenants/:tenantId/configuration', 
  requireTenant(),
  tenantConfigurationController.getConfiguration.bind(tenantConfigurationController)
);

router.put('/tenants/:tenantId/configuration',
  requireTenant(),
  tenantConfigurationController.updateConfiguration.bind(tenantConfigurationController)
);

router.post('/tenants/:tenantId/configuration/validate',
  requireTenant(),
  tenantConfigurationController.validateConfiguration.bind(tenantConfigurationController)
);

// Configuration versioning routes
router.get('/tenants/:tenantId/configuration/versions',
  requireTenant(),
  tenantConfigurationController.getVersions.bind(tenantConfigurationController)
);

router.get('/tenants/:tenantId/configuration/versions/:version',
  requireTenant(),
  tenantConfigurationController.getVersion.bind(tenantConfigurationController)
);

router.post('/tenants/:tenantId/configuration/rollback',
  requireTenant(),
  tenantConfigurationController.rollbackConfiguration.bind(tenantConfigurationController)
);

router.get('/tenants/:tenantId/configuration/diff/:fromVersion/:toVersion',
  requireTenant(),
  tenantConfigurationController.getConfigurationDiff.bind(tenantConfigurationController)
);

// Configuration change management routes
router.post('/tenants/:tenantId/configuration/change-requests',
  requireTenant(),
  tenantConfigurationController.requestChange.bind(tenantConfigurationController)
);

// Template management routes
router.post('/tenants/:tenantId/configuration/apply-template',
  requireTenant(),
  tenantConfigurationController.applyTemplate.bind(tenantConfigurationController)
);

// Import/Export routes
router.get('/tenants/:tenantId/configuration/export',
  requireTenant(),
  tenantConfigurationController.exportConfiguration.bind(tenantConfigurationController)
);

router.post('/tenants/:tenantId/configuration/import',
  requireTenant(),
  tenantConfigurationController.importConfiguration.bind(tenantConfigurationController)
);

// Global configuration routes (not tenant-specific)
router.get('/configuration/templates',
  tenantConfigurationController.getTemplates.bind(tenantConfigurationController)
);

router.post('/configuration/change-requests/:requestId/approve',
  tenantConfigurationController.approveChange.bind(tenantConfigurationController)
);

router.post('/configuration/change-requests/:requestId/reject',
  tenantConfigurationController.rejectChange.bind(tenantConfigurationController)
);

export default router;