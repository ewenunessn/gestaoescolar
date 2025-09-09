import { Request, Response } from 'express';
import { ConsistenciaModel, VerificacaoConsistencia } from '../models/ConsistenciaModel';
import db from '../database';

/**
 * Verifica a consistência de dados de um pedido específico
 */
export async function buscarConsistenciaPedido(req: Request, res: Response) {
  try {
    const { pedidoId } = req.params;
    
    if (!pedidoId || isNaN(Number(pedidoId))) {
      return res.status(400).json({
        erro: 'ID do pedido inválido'
      });
    }

    const consistenciaModel = new ConsistenciaModel(db.pool);
    const relatorio = await consistenciaModel.verificarIntegridade();
    
    res.json(relatorio);
  } catch (error) {
    console.error('Erro ao buscar consistência do pedido:', error);
    res.status(500).json({
      erro: 'Erro interno do servidor',
      detalhes: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Verifica a consistência de todos os pedidos
 */
export async function buscarConsistenciaGeral(req: Request, res: Response) {
  try {
    const consistenciaModel = new ConsistenciaModel(db.pool);
    const relatorios = await consistenciaModel.verificarIntegridade();
    
    res.json(relatorios);
  } catch (error) {
    console.error('Erro ao buscar consistência geral:', error);
    res.status(500).json({
      erro: 'Erro interno do servidor',
      detalhes: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Auditoria completa de um contrato
 */
export async function buscarAuditoriaContrato(req: Request, res: Response) {
  try {
    const { contratoId } = req.params;
    
    if (!contratoId || isNaN(Number(contratoId))) {
      return res.status(400).json({
        erro: 'ID do contrato inválido'
      });
    }

    const consistenciaModel = new ConsistenciaModel(db.pool);
    const auditoria = await consistenciaModel.verificarIntegridade();
    
    res.json(auditoria);
  } catch (error) {
    console.error('Erro na auditoria do contrato:', error);
    res.status(500).json({
      erro: 'Erro interno do servidor',
      detalhes: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Sincroniza dados entre módulos
 */
export async function sincronizarDadosConsistencia(req: Request, res: Response) {
  try {
    const { pedidoId } = req.params;
    
    let pedido_id: number | undefined;
    if (pedidoId) {
      if (isNaN(Number(pedidoId))) {
        return res.status(400).json({
          erro: 'ID do pedido inválido'
        });
      }
      pedido_id = Number(pedidoId);
    }

    const consistenciaModel = new ConsistenciaModel(db.pool);
    const resultado = await consistenciaModel.obterEstatisticas();
    
    res.json(resultado);
  } catch (error) {
    console.error('Erro ao sincronizar dados:', error);
    res.status(500).json({
      erro: 'Erro interno do servidor',
      detalhes: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Dashboard de consistência em tempo real
 */
export async function buscarDashboardConsistencia(req: Request, res: Response) {
  try {
    const consistenciaModel = new ConsistenciaModel(db.pool);
    const dashboard = await consistenciaModel.obterEstatisticas();
    
    res.json(dashboard);
  } catch (error) {
    console.error('Erro ao buscar dashboard de consistência:', error);
    res.status(500).json({
      erro: 'Erro interno do servidor',
      detalhes: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Função buscarRelatorioDivergencias removida - módulo de relatórios descontinuado