import { Router } from 'express';
import systemAdminAuthController from '../controllers/systemAdminAuthController';
import { authenticateSystemAdmin } from '../middlewares/systemAdminAuth';

const router = Router();

// Public routes
router.post('/login', systemAdminAuthController.login.bind(systemAdminAuthController));

// Protected routes
router.get('/me', authenticateSystemAdmin, systemAdminAuthController.me.bind(systemAdminAuthController));
router.post('/logout', authenticateSystemAdmin, systemAdminAuthController.logout.bind(systemAdminAuthController));

export default router;
