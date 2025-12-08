import { Router } from 'express';
import healthController from '../controllers/healthController';

const router = Router();

// Public health check
router.get('/', healthController.check.bind(healthController));

// Test provisioning (requires auth)
router.get(
  '/provisioning/:institutionId',
  healthController.testProvisioning.bind(healthController)
);

export default router;
