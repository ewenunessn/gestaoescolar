import { Router } from 'express';
import { buscarTaco } from '../controllers/tacoController';
import { authenticateToken } from '../../../middleware/authMiddleware';

const router = Router();
router.use(authenticateToken);
router.get('/buscar', buscarTaco);

export default router;
