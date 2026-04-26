import { Router, RequestHandler } from 'express';
import {
  getSystemStats
} from '../controllers/adminDataController';
import { authenticateSystemAdmin } from '../../../middleware/systemAdminAuth';

const router = Router();

// Todas as rotas requerem autenticação de system admin
router.use(authenticateSystemAdmin as unknown as RequestHandler);

// Obter estatísticas gerais do sistema
router.get('/stats', getSystemStats);

// Importar funções de deleção
import { deleteInstituicao } from '../controllers/deleteController';

// Deletar instituição (com todos os dados em cascata)
router.delete('/instituicoes/:instituicaoId', deleteInstituicao);

export default router;
