/**
 * Routes for tenant user management
 */

import { Router } from 'express';
import { tenantUserController } from '../controllers/tenantUserController';
import { 
  requireAuth, 
  requireTenantAdmin, 
  requireSystemAdmin,
  requireAdminAccess 
} from '../middlewares/tenantAuthMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(requireAuth());

// Tenant user association management
router.post('/', requireAdminAccess(), tenantUserController.createTenantUser.bind(tenantUserController));
router.get('/', requireAuth(), tenantUserController.listTenantUsers.bind(tenantUserController));
router.get('/:id', requireAuth(), tenantUserController.getTenantUser.bind(tenantUserController));
router.put('/:id', requireAdminAccess(), tenantUserController.updateTenantUser.bind(tenantUserController));
router.delete('/:id', requireAdminAccess(), tenantUserController.deleteTenantUser.bind(tenantUserController));

// Tenant-specific user management
router.get('/tenant/:tenantId/users', requireAuth(), tenantUserController.getTenantUsers.bind(tenantUserController));
router.get('/tenant/:tenantId/admins', requireAuth(), tenantUserController.getTenantAdmins.bind(tenantUserController));

// User-specific tenant management
router.get('/user/:userId/tenants', requireAuth(), tenantUserController.getUserTenants.bind(tenantUserController));

// Role management
router.post('/tenant/:tenantId/user/:userId/promote', requireAdminAccess(), tenantUserController.promoteToTenantAdmin.bind(tenantUserController));
router.post('/tenant/:tenantId/user/:userId/demote', requireAdminAccess(), tenantUserController.demoteFromTenantAdmin.bind(tenantUserController));

// Access management
router.post('/tenant/:tenantId/user/:userId/suspend', requireAdminAccess(), tenantUserController.suspendUserAccess.bind(tenantUserController));
router.post('/tenant/:tenantId/user/:userId/restore', requireAdminAccess(), tenantUserController.restoreUserAccess.bind(tenantUserController));

// Current user context
router.get('/me/context', requireAuth(), tenantUserController.getCurrentUserContext.bind(tenantUserController));

export default router;