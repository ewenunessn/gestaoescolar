import { Router } from 'express';
import { authenticateToken } from '../../../middleware/authMiddleware';
import { getDashboardStats } from '../controllers/dashboardController';

const router = Router();
router.get('/stats', authenticateToken, getDashboardStats);
export default router;
