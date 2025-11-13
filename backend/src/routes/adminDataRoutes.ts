import { Router } from 'express';
import {
  listTenantsWithStats,
  getTenantData,
  updateTenantStatus,
  getSystemStats
} from '../controllers/adminDataController';
import { systemAdminAuth } from '../middlewares/systemAdminAuth';

const router = Router();

// Todas as rotas requerem autenticação de system admin
router.use(systemAdminAuth);

// Listar todos os tenants com estatísticas
router.get('/tenants', listTenantsWithStats);

// Obter dados detalhados de um tenant
router.get('/tenants/:tenantId', getTenantData);

// Atualizar status do tenant
router.patch('/tenants/:tenantId/status', updateTenantStatus);

// Obter estatísticas gerais do sistema
router.get('/stats', getSystemStats);

export default router;
