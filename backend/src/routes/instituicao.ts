import express from 'express';
import { 
  buscarInstituicao, 
  atualizarInstituicao, 
  uploadLogoBase64,
  salvarTemplate,
  upload 
} from '../controllers/instituicaoController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', authenticateToken, buscarInstituicao);
router.put('/', authenticateToken, upload.single('logo'), atualizarInstituicao);
router.post('/logo-base64', authenticateToken, uploadLogoBase64);
router.put('/templates/:nome', authenticateToken, salvarTemplate);

export default router;