import express from 'express';
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
router.post('/', criarTipoRefeicao);
router.put('/:id', atualizarTipoRefeicao);
router.delete('/:id', deletarTipoRefeicao);

export default router;
