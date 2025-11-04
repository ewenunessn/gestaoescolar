/**
 * Routes for tenant switching functionality
 */

import { Router } from 'express';
import { tenantSwitchController } from '../controllers/tenantSwitchController';
import { requireAuth } from '../middlewares/tenantAuthMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(requireAuth());

// Tenant switching
router.post('/switch', tenantSwitchController.switchTenant.bind(tenantSwitchController));
router.get('/available', tenantSwitchController.getAvailableTenants.bind(tenantSwitchController));
router.post('/refresh-token', tenantSwitchController.refreshToken.bind(tenantSwitchController));

export default router;