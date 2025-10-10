import { Request, Response } from 'express';
import { demandaModel } from '../models/demandaModel';

export const demandaController = {
  async criar(req: Request, res: Response) {
    try {
      // Usuário opcional - se não estiver autenticado, usa ID 1 (sistema)
      const usuarioId = (req as any).usuario?.id || 1;

      const demanda = await demandaModel.criar({
        ...req.body,
        data_semead: req.body.data_semead || null, // Opcional
        status: 'pendente', // Sempre começa como pendente
        usuario_criacao_id: usuarioId
      });

      res.status(201).json({
        success: true,
        message: 'Demanda criada com sucesso',
        data: demanda
      });
    } catch (error: any) {
      console.error('Erro ao criar demanda:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao criar demanda',
        error: error.message
      });
    }
  },

  async listar(req: Request, res: Response) {
    try {
      const { escola_id, escola_nome, objeto, status, data_inicio, data_fim } = req.query;

      const demandas = await demandaModel.listar({
        escola_id: escola_id ? Number(escola_id) : undefined,
        escola_nome: escola_nome as string,
        objeto: objeto as string,
        status: status as string,
        data_inicio: data_inicio as string,
        data_fim: data_fim as string
      });

      res.json({
        success: true,
        data: demandas
      });
    } catch (error: any) {
      console.error('Erro ao listar demandas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar demandas',
        error: error.message
      });
    }
  },

  async listarSolicitantes(req: Request, res: Response) {
    try {
      const solicitantes = await demandaModel.listarSolicitantes();

      res.json({
        success: true,
        data: solicitantes
      });
    } catch (error: any) {
      console.error('Erro ao listar solicitantes:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar solicitantes',
        error: error.message
      });
    }
  },

  async buscarPorId(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const demanda = await demandaModel.buscarPorId(Number(id));

      if (!demanda) {
        return res.status(404).json({
          success: false,
          message: 'Demanda não encontrada'
        });
      }

      res.json({
        success: true,
        data: demanda
      });
    } catch (error: any) {
      console.error('Erro ao buscar demanda:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar demanda',
        error: error.message
      });
    }
  },

  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const demanda = await demandaModel.atualizar(Number(id), req.body);

      res.json({
        success: true,
        message: 'Demanda atualizada com sucesso',
        data: demanda
      });
    } catch (error: any) {
      console.error('Erro ao atualizar demanda:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar demanda',
        error: error.message
      });
    }
  },

  async excluir(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await demandaModel.excluir(Number(id));

      res.json({
        success: true,
        message: 'Demanda excluída com sucesso'
      });
    } catch (error: any) {
      console.error('Erro ao excluir demanda:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao excluir demanda',
        error: error.message
      });
    }
  },

  async atualizarStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, data_resposta_semead, observacoes } = req.body;

      const dados: any = { status };
      
      if (data_resposta_semead) {
        dados.data_resposta_semead = data_resposta_semead;
      }
      
      if (observacoes !== undefined) {
        dados.observacoes = observacoes;
      }

      const demanda = await demandaModel.atualizar(Number(id), dados);

      res.json({
        success: true,
        message: 'Status atualizado com sucesso',
        data: demanda
      });
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar status',
        error: error.message
      });
    }
  }
};
