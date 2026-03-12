import express from 'express';
import { 
  buscarInstituicao, 
  atualizarInstituicao, 
  uploadLogoBase64,
  upload 
} from '../controllers/instituicaoController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// Buscar configurações da instituição
router.get('/', authenticateToken, buscarInstituicao);

// Atualizar configurações da instituição (com upload de arquivo)
router.put('/', authenticateToken, upload.single('logo'), atualizarInstituicao);

// Upload de logo via base64
router.post('/logo-base64', authenticateToken, uploadLogoBase64);

export default router;