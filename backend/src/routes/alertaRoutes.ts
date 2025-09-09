import { Router } from 'express';
import { AlertaController } from '../controllers/alertaController';
import { authMiddleware } from '../middlewares/authMiddleware';
import db from '../database';

export function createAlertaRoutes(): Router {
  const router = Router();
  const alertaController = new AlertaController(db.pool);

  // Middleware de autenticação para todas as rotas
  router.use(authMiddleware);

  // Listar alertas do usuário
  router.get('/', (req, res) => 
    alertaController.listarAlertas(req, res)
  );

  // Obter estatísticas de alertas
  router.get('/estatisticas', (req, res) => 
    alertaController.obterEstatisticas(req, res)
  );

  // Dashboard de alertas (usando estatísticas)
  router.get('/dashboard', (req, res) => 
    alertaController.obterEstatisticas(req, res)
  );

  // Marcar alerta específico como lido
  router.put('/:alertaId/marcar-lido', (req, res) => 
    alertaController.marcarComoLido(req, res)
  );

  // Marcar alerta como resolvido
  router.put('/:alertaId/marcar-resolvido', (req, res) => 
    alertaController.marcarComoResolvido(req, res)
  );

  // Criar alerta manual (apenas admins/gerentes)
  router.post('/criar', (req, res) => 
    alertaController.criarAlerta(req, res)
  );

  // Executar verificações de alertas
  router.post('/executar-verificacoes', (req, res) => 
    alertaController.executarVerificacoes(req, res)
  );

  return router;
}