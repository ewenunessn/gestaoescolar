import { NextFunction, Request, Response, Router } from 'express';
import {
  listarPeriodos,
  obterPeriodoAtivo,
  criarPeriodo,
  atualizarPeriodo,
  ativarPeriodo,
  fecharPeriodo,
  reabrirPeriodo,
  deletarPeriodo,
  selecionarPeriodoUsuario
} from '../controllers/periodosController';
import { authenticateToken } from '../../../middleware/authMiddleware';
import { requireEscrita, requireLeitura } from '../../../middleware/permissionMiddleware';

const router = Router();
const periodosRead = requireLeitura('periodos');
const periodosWrite = requireEscrita('periodos');

export function requirePeriodosRead(req: Request, res: Response, next: NextFunction) {
  return periodosRead(req, res, next);
}

export function requirePeriodosWrite(req: Request, res: Response, next: NextFunction) {
  return periodosWrite(req, res, next);
}

// Listar todos os periodos
router.get('/', authenticateToken, requirePeriodosRead, listarPeriodos);

// Obter periodo ativo (ou periodo do usuario)
router.get('/ativo', authenticateToken, requirePeriodosRead, obterPeriodoAtivo);

// Selecionar periodo do usuario
router.post('/selecionar', authenticateToken, selecionarPeriodoUsuario);

// Criar novo periodo
router.post('/', authenticateToken, requirePeriodosWrite, criarPeriodo);

// Atualizar periodo
router.put('/:id', authenticateToken, requirePeriodosWrite, atualizarPeriodo);

// Ativar periodo
router.patch('/:id/ativar', authenticateToken, requirePeriodosWrite, ativarPeriodo);

// Fechar periodo
router.patch('/:id/fechar', authenticateToken, requirePeriodosWrite, fecharPeriodo);

// Reabrir periodo
router.patch('/:id/reabrir', authenticateToken, requirePeriodosWrite, reabrirPeriodo);

// Deletar periodo
router.delete('/:id', authenticateToken, requirePeriodosWrite, deletarPeriodo);

export default router;
