import { Router } from 'express';
import institutionController from '../controllers/institutionController';
import { authenticateSystemAdmin } from '../middlewares/systemAdminAuth';

const router = Router();

// All routes require system admin authentication
router.use(authenticateSystemAdmin);

// Institution CRUD
router.post('/', institutionController.create.bind(institutionController));
router.get('/', institutionController.list.bind(institutionController));
router.get('/:id', institutionController.getById.bind(institutionController));
router.get('/slug/:slug', institutionController.getBySlug.bind(institutionController));
router.put('/:id', institutionController.update.bind(institutionController));
router.delete('/:id', institutionController.delete.bind(institutionController));

// Institution statistics
router.get('/:id/stats', institutionController.getStats.bind(institutionController));

// Institution users management
router.get('/:id/users', institutionController.getUsers.bind(institutionController));
router.post('/:id/users', institutionController.addUser.bind(institutionController));
router.put('/:id/users/:userId', institutionController.updateUser.bind(institutionController));
router.delete('/:id/users/:userId', institutionController.removeUser.bind(institutionController));

// Institution tenants
router.get('/:id/tenants', institutionController.getTenants.bind(institutionController));

export default router;
