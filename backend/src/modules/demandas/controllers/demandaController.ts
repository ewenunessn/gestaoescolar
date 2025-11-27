import { Request, Response } from 'express';
import { demandaModel } from '../models/demandaModel';
import { setTenantContextFromRequest } from '../../../utils/tenantContext';

export const demandaController = {
  async criar(req: Request, res: Response) {
    try {
      console.log('🔄 [DEMANDAS] Iniciando criar...');
      
      // Obter tenant_id de múltiplas fontes
      const tenantId = (req as any).tenant?.id || req.get('X-Tenant-ID') || req.headers['x-tenant-id'];
      
      console.log('🔍 [DEMANDAS] Tenant ID:', tenantId);
      console.log('🔍 [DEMANDAS] req.tenant:', (req as any).tenant);
      console.log('🔍 [DEMANDAS] Headers:', req.headers);
      
      if (!tenantId) {
        console.error('❌ [DEMANDAS] Tenant ID não encontrado');
        return res.status(400).json({
          success: false,
          message: 'Tenant ID não encontrado'
        });
      }

      const usuarioId = (req as any).usuario?.id || (req as any).user?.id || 1;
      
      console.log('🔍 [DEMANDAS] Usuario ID:', usuarioId);
      console.log('🔍 [DEMANDAS] Body:', req.body);

      const demanda = await demandaModel.criar({
        ...req.body,
        tenant_id: tenantId,
        data_semead: req.body.data_semead || null,
        status: 'pendente',
        usuario_criacao_id: usuarioId
      });

      console.log('✅ [DEMANDAS] Demanda criada:', demanda.id);

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

  async listar(req: Request, res: Response) {
    try {
      console.log('🔄 [DEMANDAS] Iniciando listar...');
      
      // Obter tenant_id diretamente do header (mais rápido)
      const tenantId = (req as any).tenant?.id || req.get('X-Tenant-ID') || req.headers['x-tenant-id'];
      
      console.log('🔍 [DEMANDAS] Tenant ID:', tenantId);
      
      if (!tenantId) {
        console.error('❌ [DEMANDAS] Tenant ID não encontrado');
        return res.status(400).json({
          success: false,
          message: 'Tenant ID não encontrado'
        });
      }

      const { escola_id, escola_nome, objeto, status, data_inicio, data_fim } = req.query;

      console.log('🔍 [DEMANDAS] Chamando demandaModel.listar...');
      const startTime = Date.now();
      
      const demandas = await demandaModel.listar(tenantId, {
        escola_id: escola_id ? Number(escola_id) : undefined,
        escola_nome: escola_nome as string,
        objeto: objeto as string,
        status: status as string,
        data_inicio: data_inicio as string,
        data_fim: data_fim as string
      });

      const duration = Date.now() - startTime;
      console.log(`✅ [DEMANDAS] Query executada em ${duration}ms, ${demandas.length} resultados`);

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
      console.log('🔄 [DEMANDAS] Iniciando listarSolicitantes...');
      
      // Obter tenant_id diretamente do header
      const tenantId = (req as any).tenant?.id || req.get('X-Tenant-ID') || req.headers['x-tenant-id'];
      
      if (!tenantId) {
        console.error('❌ [DEMANDAS] Tenant ID não encontrado');
        return res.status(400).json({
          success: false,
          message: 'Tenant ID não encontrado'
        });
      }

      console.log('🔍 [DEMANDAS] Chamando listarSolicitantes...');
      const startTime = Date.now();
      
      const solicitantes = await demandaModel.listarSolicitantes(tenantId);
      
      const duration = Date.now() - startTime;
      console.log(`✅ [DEMANDAS] ${solicitantes.length} solicitantes encontrados em ${duration}ms`);

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
      console.log('🔄 [DEMANDAS] Iniciando buscarPorId...');
      
      // Obter tenant_id de múltiplas fontes
      const tenantId = (req as any).tenant?.id || req.get('X-Tenant-ID') || req.headers['x-tenant-id'];
      
      console.log('🔍 [DEMANDAS] Tenant ID:', tenantId);
      
      if (!tenantId) {
        console.error('❌ [DEMANDAS] Tenant ID não encontrado');
        return res.status(400).json({
          success: false,
          message: 'Tenant ID não encontrado'
        });
      }

      const { id } = req.params;
      console.log('🔍 [DEMANDAS] Buscando demanda ID:', id);
      
      const demanda = await demandaModel.buscarPorId(Number(id), tenantId);

      if (!demanda) {
        console.log('❌ [DEMANDAS] Demanda não encontrada');
        return res.status(404).json({
          success: false,
          message: 'Demanda não encontrada'
        });
      }

      console.log('✅ [DEMANDAS] Demanda encontrada:', demanda.id);

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

  async atualizar(req: Request, res: Response) {
    try {
      console.log('🔄 [DEMANDAS] Iniciando atualizar...');
      
      // Obter tenant_id de múltiplas fontes
      const tenantId = (req as any).tenant?.id || req.get('X-Tenant-ID') || req.headers['x-tenant-id'];
      
      if (!tenantId) {
        console.error('❌ [DEMANDAS] Tenant ID não encontrado');
        return res.status(400).json({
          success: false,
          message: 'Tenant ID não encontrado'
        });
      }

      const { id } = req.params;
      console.log('🔍 [DEMANDAS] Atualizando demanda ID:', id);
      
      const demanda = await demandaModel.atualizar(Number(id), tenantId, req.body);

      console.log('✅ [DEMANDAS] Demanda atualizada:', demanda.id);

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
      console.log('🔄 [DEMANDAS] Iniciando excluir...');
      
      // Obter tenant_id de múltiplas fontes
      const tenantId = (req as any).tenant?.id || req.get('X-Tenant-ID') || req.headers['x-tenant-id'];
      
      if (!tenantId) {
        console.error('❌ [DEMANDAS] Tenant ID não encontrado');
        return res.status(400).json({
          success: false,
          message: 'Tenant ID não encontrado'
        });
      }

      const { id } = req.params;
      console.log('🔍 [DEMANDAS] Excluindo demanda ID:', id);
      
      await demandaModel.excluir(Number(id), tenantId);

      console.log('✅ [DEMANDAS] Demanda excluída:', id);

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
      console.log('🔄 [DEMANDAS] Iniciando atualizarStatus...');
      
      // Obter tenant_id de múltiplas fontes
      const tenantId = (req as any).tenant?.id || req.get('X-Tenant-ID') || req.headers['x-tenant-id'];
      
      if (!tenantId) {
        console.error('❌ [DEMANDAS] Tenant ID não encontrado');
        return res.status(400).json({
          success: false,
          message: 'Tenant ID não encontrado'
        });
      }

      const { id } = req.params;
      const { status, data_resposta_semead, observacoes } = req.body;

      console.log('🔍 [DEMANDAS] Atualizando status da demanda ID:', id, 'para:', status);

      const dados: any = { status };
      
      if (data_resposta_semead) {
        dados.data_resposta_semead = data_resposta_semead;
      }
      
      if (observacoes !== undefined) {
        dados.observacoes = observacoes;
      }

      const demanda = await demandaModel.atualizar(Number(id), tenantId, dados);

      console.log('✅ [DEMANDAS] Status atualizado:', demanda.id);

      res.json({
        success: true,
        message: 'Status atualizado com sucesso',
        data: demanda
      });
    } catch (error: any) {
      console.error('❌ [DEMANDAS] Erro ao atualizar status:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar status',
        error: error.message
      });
    }
  }
};
