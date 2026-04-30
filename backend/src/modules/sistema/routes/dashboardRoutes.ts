import { NextFunction, Request, Response, Router } from 'express';
import { authenticateToken } from '../../../middleware/authMiddleware';
import { requireLeitura } from '../../../middleware/permissionMiddleware';
import { getDashboardStats } from '../controllers/dashboardController';

const router = Router();
const dashboardRead = requireLeitura('dashboard');

export function requireDashboardRead(req: Request, res: Response, next: NextFunction) {
  return dashboardRead(req, res, next);
}

router.get('/stats', authenticateToken, requireDashboardRead, getDashboardStats);
export default router;
