import { Router, RequestHandler } from 'express';
import systemAdminAuthController from '../controllers/systemAdminAuthController';
import { authenticateSystemAdmin } from '../../../middleware/systemAdminAuth';

const router = Router();

// Public routes
router.post('/login', systemAdminAuthController.login.bind(systemAdminAuthController));

// Protected routes
router.get('/me', authenticateSystemAdmin as unknown as RequestHandler, systemAdminAuthController.me.bind(systemAdminAuthController));
router.post('/logout', authenticateSystemAdmin as unknown as RequestHandler, systemAdminAuthController.logout.bind(systemAdminAuthController));

export default router;
