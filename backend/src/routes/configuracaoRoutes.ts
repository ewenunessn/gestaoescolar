import { Router } from 'express';
import configuracaoController from '../controllers/configuracaoController';
const router = Router();

// Rotas para configurações do sistema
router.get('/', configuracaoController.listarTodas);
router.get('/categoria/:categoria', configuracaoController.listarPorCategoria);
router.get('/:chave', configuracaoController.buscarConfiguracao);
router.post('/', configuracaoController.salvarConfiguracao);
router.put('/:chave', configuracaoController.atualizarConfiguracao);
router.delete('/:chave', configuracaoController.deletarConfiguracao);

export default router;