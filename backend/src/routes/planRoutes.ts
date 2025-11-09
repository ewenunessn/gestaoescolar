import { Router } from 'express';
import planController from '../controllers/planController';

const router = Router();

// Public routes (no auth required for listing plans)
router.get('/', planController.list.bind(planController));
router.get('/:id', planController.getById.bind(planController));

export default router;
