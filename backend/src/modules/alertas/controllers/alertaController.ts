import { Request, Response } from 'express';
import { Pool } from 'pg';
import { AlertaService } from '../services/AlertaService';

export class AlertaController {
  private alertaService: AlertaService;

  constructor(pool: Pool) {
    this.alertaService = new AlertaService(pool);
  }

  async listarAlertas(req: Request, res: Response): Promise<void> {
    try {
      const { tipo, prioridade, status } = req.query;
      const usuarioId = (req as any).user?.id;

      const filtros = {
        tipo: tipo as string,
        prioridade: prioridade as string,
        status: status as string,
        usuario_id: usuarioId
      };

      const alertas = await this.alertaService.listarAlertas(filtros);

      res.json({
        success: true,
        data: alertas
      });
    } catch (error) {
      console.error('Erro ao listar alertas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  async criarAlerta(req: Request, res: Response): Promise<void> {
    try {
      const {
        tipo,
        titulo,
        mensagem,
        prioridade,
        usuario_id,
        dados_contexto,
        data_expiracao
      } = req.body;

      const alerta = await this.alertaService.criarAlerta({
        tipo,
        titulo,
        mensagem,
        prioridade,
        status: 'pendente',
        usuario_id,
        dados_contexto,
        data_expiracao: data_expiracao ? new Date(data_expiracao) : undefined
      });

      res.status(201).json({
        success: true,
        data: alerta,
        message: 'Alerta criado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao criar alerta:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  async marcarComoLido(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const sucesso = await this.alertaService.marcarComoLido(parseInt(id));

      if (sucesso) {
        res.json({
          success: true,
          message: 'Alerta marcado como lido'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Alerta não encontrado'
        });
      }
    } catch (error) {
      console.error('Erro ao marcar alerta como lido:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  async marcarComoResolvido(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const sucesso = await this.alertaService.marcarComoResolvido(parseInt(id));

      if (sucesso) {
        res.json({
          success: true,
          message: 'Alerta marcado como resolvido'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Alerta não encontrado'
        });
      }
    } catch (error) {
      console.error('Erro ao marcar alerta como resolvido:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  async ignorarAlerta(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const sucesso = await this.alertaService.ignorarAlerta(parseInt(id));

      if (sucesso) {
        res.json({
          success: true,
          message: 'Alerta ignorado'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Alerta não encontrado'
        });
      }
    } catch (error) {
      console.error('Erro ao ignorar alerta:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  async executarVerificacoes(req: Request, res: Response): Promise<void> {
    try {
      await this.alertaService.executarVerificacoes();

      res.json({
        success: true,
        message: 'Verificações de alertas executadas com sucesso'
      });
    } catch (error) {
      console.error('Erro ao executar verificações:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  async obterEstatisticas(req: Request, res: Response): Promise<void> {
    try {
      const estatisticas = await this.alertaService.obterEstatisticas();

      res.json({
        success: true,
        data: estatisticas
      });
    } catch (error) {
      console.error('Erro ao obter estatísticas de alertas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  async limparAlertasExpirados(req: Request, res: Response): Promise<void> {
    try {
      const removidos = await this.alertaService.limparAlertasExpirados();

      res.json({
        success: true,
        message: `${removidos} alertas expirados removidos`,
        data: { removidos }
      });
    } catch (error) {
      console.error('Erro ao limpar alertas expirados:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }
}