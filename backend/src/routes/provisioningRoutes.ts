import { Router } from 'express';
import provisioningController from '../controllers/provisioningController';
import { authenticateSystemAdmin } from '../middlewares/systemAdminAuth';

const router = Router();

// All routes require system admin authentication
router.use(authenticateSystemAdmin);

// Provisioning routes
router.post('/complete', provisioningController.provisionComplete.bind(provisioningController));

// Create additional tenant for institution
router.post(
  '/institutions/:institutionId/tenants',
  provisioningController.createTenant.bind(provisioningController)
);

// Create user for institution
router.post(
  '/institutions/:institutionId/users',
  provisioningController.createUser.bind(provisioningController)
);

// Get institution hierarchy
router.get(
  '/institutions/:institutionId/hierarchy',
  provisioningController.getHierarchy.bind(provisioningController)
);

export default router;
