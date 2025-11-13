import { Router } from 'express';
import {
  listTenantsWithStats,
  getTenantData,
  updateTenantStatus,
  getSystemStats
} from '../controllers/adminDataController';
import { authenticateSystemAdmin } from '../middlewares/systemAdminAuth';

const router = Router();

// Todas as rotas requerem autenticação de system admin
router.use(authenticateSystemAdmin);

// Listar todos os tenants com estatísticas
router.get('/tenants', listTenantsWithStats);

// Obter dados detalhados de um tenant
router.get('/tenants/:tenantId', getTenantData);

// Atualizar status do tenant
router.patch('/tenants/:tenantId/status', updateTenantStatus);

// Obter estatísticas gerais do sistema
router.get('/stats', getSystemStats);

// Importar funções de deleção
import { deleteTenant, deleteInstitution } from '../controllers/deleteController';

// Deletar tenant (com todos os dados em cascata)
router.delete('/tenants/:tenantId', deleteTenant);

// Deletar instituição (com todos os tenants e dados em cascata)
router.delete('/institutions/:institutionId', deleteInstitution);

export default router;
