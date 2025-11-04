/**
 * Rotas para gerenciamento de tenants
 */

import { Router } from 'express';
import {
  listTenants,
  getTenant,
  createTenant,
  updateTenant,
  deleteTenant,
  provisionTenant,
  testTenantResolution,
  getCurrentTenantContext,
  getTenantConfigurations,
  setTenantConfiguration,
  updateTenantConfiguration,
  deleteTenantConfiguration,
  getTenantUsers,
  addTenantUser,
  updateTenantUser,
  removeTenantUser,
  getTenantStats,
  deprovisionTenant,
  toggleTenantStatus,
  resolveTenant
} from '../controllers/tenantController';
import { noTenant, optionalTenant } from '../middleware/tenantMiddleware';

// Import tenant switch controller
import { tenantSwitchController } from '../controllers/tenantSwitchController';
import { requireAuth } from '../middlewares/tenantAuthMiddleware';

const router = Router();

// Rotas administrativas (sem contexto de tenant)
router.get('/', noTenant(), listTenants);
router.get('/resolve', optionalTenant(), resolveTenant);
router.get('/test-resolution', noTenant(), testTenantResolution);
router.post('/', noTenant(), createTenant);
router.post('/provision', noTenant(), provisionTenant);

// Rotas com contexto opcional de tenant
router.get('/context', optionalTenant(), getCurrentTenantContext);

// Tenant switching routes (require authentication) - DEVE VIR ANTES DAS ROTAS COM :id
router.post('/switch', requireAuth(), tenantSwitchController.switchTenant.bind(tenantSwitchController));
router.get('/available', requireAuth(), tenantSwitchController.getAvailableTenants.bind(tenantSwitchController));
router.post('/refresh-token', requireAuth(), tenantSwitchController.refreshToken.bind(tenantSwitchController));

// Rotas específicas de tenant
router.get('/:id', noTenant(), getTenant);
router.put('/:id', noTenant(), updateTenant);
router.delete('/:id', noTenant(), deleteTenant);

// Rotas de configuração de tenant
router.get('/:id/configurations', noTenant(), getTenantConfigurations);
router.post('/:id/configurations', noTenant(), setTenantConfiguration);
router.put('/:id/configurations/:configId', noTenant(), updateTenantConfiguration);
router.delete('/:id/configurations/:configId', noTenant(), deleteTenantConfiguration);

// Rotas de usuários de tenant
router.get('/:id/users', noTenant(), getTenantUsers);
router.post('/:id/users', noTenant(), addTenantUser);
router.put('/:id/users/:userId', noTenant(), updateTenantUser);
router.delete('/:id/users/:userId', noTenant(), removeTenantUser);

// Rotas de estatísticas de tenant
router.get('/:id/stats', noTenant(), getTenantStats);

// Rotas de operações especiais
router.post('/:id/deprovision', noTenant(), deprovisionTenant);
router.patch('/:id/status', noTenant(), toggleTenantStatus);



export default router;