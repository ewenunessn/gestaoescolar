import { Router } from 'express';
import {
  getSystemStats
} from '../controllers/adminDataController';
import { authenticateSystemAdmin } from '../middlewares/systemAdminAuth';

const router = Router();

// Todas as rotas requerem autenticação de system admin
router.use(authenticateSystemAdmin);

// Obter estatísticas gerais do sistema
router.get('/stats', getSystemStats);

// Importar funções de deleção
import { deleteInstitution } from '../controllers/deleteController';

// Deletar instituição (com todos os dados em cascata)
router.delete('/institutions/:institutionId', deleteInstitution);

export default router;
