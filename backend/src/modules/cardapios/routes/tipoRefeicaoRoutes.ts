import express from 'express';
import { authenticateToken } from "../../../middleware/authMiddleware";
import {
  listarTiposRefeicao,
  buscarTipoRefeicao,
  criarTipoRefeicao,
  atualizarTipoRefeicao,
  deletarTipoRefeicao
} from '../controllers/tipoRefeicaoController';

const router = express.Router();

router.get('/', listarTiposRefeicao);
router.get('/:id', buscarTipoRefeicao);
router.post('/', authenticateToken, criarTipoRefeicao);
router.put('/:id', authenticateToken, atualizarTipoRefeicao);
router.delete('/:id', authenticateToken, deletarTipoRefeicao);

export default router;
