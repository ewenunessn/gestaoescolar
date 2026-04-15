import { Request, Response } from 'express';
import { demandaModel } from '../models/demandaModel';
import db from '../../../database';
import { obterPeriodoUsuario } from '../../../utils/periodoUsuarioHelper';
import {
  asyncHandler,
  ValidationError,
  NotFoundError,
  BusinessError,
  ConflictError,
  validateRequired,
  handleDatabaseError
} from '../../../utils/errorHandler';

export const demandaController = {

  async listarCardapiosDisponiveis(req: Request, res: Response) {
    try {
      const { mes, ano } = req.query;
      const userId = req.user?.id;

      const params: any[] = [];
      let paramIndex = 1;
      let whereClause = 'WHERE cm.ativo = true';

      // Se mês/ano fornecidos, filtrar por competência (ignora período)
      if (mes && ano) {
        whereClause += ` AND cm.mes = $${paramIndex}`;
        params.push(Number(mes));
        paramIndex++;
        whereClause += ` AND cm.ano = $${paramIndex}`;
        params.push(Number(ano));
        paramIndex++;
      } else {
        // Sem competência: filtrar pelo período do usuário
        const periodoId = await obterPeriodoUsuario(userId);
        if (periodoId) {
          whereClause += ` AND cm.periodo_id = $${paramIndex}`;
          params.push(periodoId);
          paramIndex++;
        }
      }

      const query = `
        SELECT DISTINCT
          cm.id,
          cm.nome,
          cm.mes,
          cm.ano,
          STRING_AGG(DISTINCT m.nome, ', ' ORDER BY m.nome) FILTER (WHERE m.nome IS NOT NULL) as modalidade_nome,
          COUNT(DISTINCT crd.id) as total_refeicoes
        FROM cardapios_modalidade cm
        LEFT JOIN cardapio_refeicoes_dia crd ON cm.id = crd.cardapio_modalidade_id
        LEFT JOIN cardapio_modalidades cjm ON cjm.cardapio_id = cm.id
        LEFT JOIN modalidades m ON m.id = cjm.modalidade_id
        ${whereClause}
        GROUP BY cm.id, cm.nome, cm.mes, cm.ano
        ORDER BY cm.ano DESC, cm.mes DESC, cm.nome
      `;

      const result = await db.query(query, params);
      res.json({ success: true, data: result.rows });
    } catch (error: any) {
      console.error('Erro ao listar cardápios disponíveis:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },


  async listar(req: Request, res: Response) {
    try {

      const { escola_id, escola_nome, objeto, status, data_inicio, data_fim } = req.query;

      const startTime = Date.now();
      
      const demandas = await demandaModel.listar({
        escola_id: escola_id ? Number(escola_id) : undefined,
        escola_nome: escola_nome as string,
        objeto: objeto as string,
        status: status as string,
        data_inicio: data_inicio as string,
        data_fim: data_fim as string
      });

      const duration = Date.now() - startTime;

      res.json({
        success: true,
        data: demandas
      });
    } catch (error: any) {
      console.error('❌ [DEMANDAS] Erro ao listar demandas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar demandas',
        error: error.message
      });
    }
  },

  async listarSolicitantes(req: Request, res: Response) {
    try {

      const startTime = Date.now();
      
      const solicitantes = await demandaModel.listarSolicitantes();
      
      const duration = Date.now() - startTime;

      res.json({
        success: true,
        data: solicitantes
      });
    } catch (error: any) {
      console.error('❌ [DEMANDAS] Erro ao listar solicitantes:', error);
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
      console.error('❌ [DEMANDAS] Erro ao buscar demanda:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar demanda',
        error: error.message
      });
    }
  },

  async criar(req: Request, res: Response) {
    try {
      
      const demanda = await demandaModel.criar(req.body);


      res.status(201).json({
        success: true,
        message: 'Demanda criada com sucesso',
        data: demanda
      });
    } catch (error: any) {
      console.error('❌ [DEMANDAS] Erro ao criar demanda:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao criar demanda',
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
      console.error('❌ [DEMANDAS] Erro ao atualizar demanda:', error);
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
      console.error('❌ [DEMANDAS] Erro ao excluir demanda:', error);
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
      const { status } = req.body;
      
      
      const demanda = await demandaModel.atualizarStatus(Number(id), status);


      res.json({
        success: true,
        message: 'Status da demanda atualizado com sucesso',
        data: demanda
      });
    } catch (error: any) {
      console.error('❌ [DEMANDAS] Erro ao atualizar status:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar status da demanda',
        error: error.message
      });
    }
  }
};

export default demandaController;