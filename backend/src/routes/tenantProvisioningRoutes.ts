/**
 * Tenant Provisioning Routes
 * API routes for automated tenant provisioning workflows
 */

import { Router } from 'express';
import {
  listTenantTemplates,
  getTenantTemplate,
  createTenantTemplate,
  updateTenantTemplate,
  deleteTenantTemplate,
  provisionFromTemplate,
  provisionCustomTenant,
  getProvisioningProgress,
  listProvisioningProgress,
  cancelProvisioning,
  retryFailedStep,
  deprovisionTenant,
  scheduleDeprovisioning,
  recoverFailedProvisioning,
  cleanupFailedProvisioning,
  getProvisioningStats
} from '../controllers/tenantProvisioningController';
import { noTenant } from '../middleware/tenantMiddleware';

const router = Router();

// All provisioning routes are administrative and don't require tenant context
router.use(noTenant());

// Template management routes
router.get('/templates', listTenantTemplates);
router.get('/templates/:id', getTenantTemplate);
router.post('/templates', createTenantTemplate);
router.put('/templates/:id', updateTenantTemplate);
router.delete('/templates/:id', deleteTenantTemplate);

// Provisioning workflow routes
router.post('/templates/:templateId/provision', provisionFromTemplate);
router.post('/provision/custom', provisionCustomTenant);

// Progress tracking routes
router.get('/progress', listProvisioningProgress);
router.get('/progress/:progressId', getProvisioningProgress);
router.post('/progress/:progressId/cancel', cancelProvisioning);
router.post('/progress/:progressId/steps/:stepId/retry', retryFailedStep);
router.post('/progress/:progressId/recover', recoverFailedProvisioning);
router.post('/progress/:progressId/cleanup', cleanupFailedProvisioning);

// Deprovisioning routes
router.post('/tenants/:tenantId/deprovision', deprovisionTenant);
router.post('/tenants/:tenantId/schedule-deprovision', scheduleDeprovisioning);

// Statistics and monitoring
router.get('/stats', getProvisioningStats);

export default router;