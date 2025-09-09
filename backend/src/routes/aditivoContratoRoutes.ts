import { Router } from 'express';
import { Pool } from 'pg';
import { AditivoContratoController } from '../controllers/aditivoContratoController';

export function createAditivoContratoRoutes(pool: Pool): Router {
  const router = Router();
  const controller = new AditivoContratoController(pool);

  // Listar todos os aditivos
  router.get('/', async (req, res) => {
    await controller.listar(req, res);
  });

  // Criar novo aditivo
  router.post('/', async (req, res) => {
    await controller.criar(req, res);
  });

  // Listar aditivos de um contrato
  router.get('/contrato/:contratoId', async (req, res) => {
    await controller.listarPorContrato(req, res);
  });

  // Buscar aditivo por ID
  router.get('/:id', async (req, res) => {
    await controller.buscarPorId(req, res);
  });

  // Remover aditivo
  router.delete('/:id', async (req, res) => {
    await controller.remover(req, res);
  });

  // Calcular resumo de aditivos por contrato
  router.get('/contrato/:contratoId/resumo', async (req, res) => {
    await controller.calcularResumo(req, res);
  });

  // Listar produtos de um contrato para aditivos
  router.get('/contrato/:contratoId/produtos', async (req, res) => {
    await controller.listarProdutosContrato(req, res);
  });

  // Validar aditivo de quantidade
  router.post('/validar-quantidade', async (req, res) => {
    await controller.validarAditivoQuantidade(req, res);
  });

  return router;
}

export default createAditivoContratoRoutes;