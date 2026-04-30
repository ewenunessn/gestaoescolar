import { NextFunction, Request, Response, Router } from 'express';
import {
  buscarInstituicao,
  atualizarInstituicao,
  uploadLogoBase64,
  salvarTemplate,
  upload
} from '../controllers/instituicaoController';
import { authenticateToken } from '../../../middleware/authMiddleware';
import { requireEscrita } from '../../../middleware/permissionMiddleware';

const router = Router();
const configuracoesWrite = requireEscrita('configuracoes');

export function requireConfiguracoesWrite(req: Request, res: Response, next: NextFunction) {
  return configuracoesWrite(req, res, next);
}

router.get('/', authenticateToken, buscarInstituicao);
router.put('/', authenticateToken, requireConfiguracoesWrite, upload.single('logo'), atualizarInstituicao);
router.post('/logo-base64', authenticateToken, requireConfiguracoesWrite, uploadLogoBase64);
router.put('/templates/:nome', authenticateToken, requireConfiguracoesWrite, salvarTemplate);

export default router;
