import { Request, Response } from 'express';
import EntregaModel from '../models/Entrega';
import {
  asyncHandler,
  ValidationError,
  NotFoundError,
  BusinessError,
  ConflictError,
  validateRequired,
  handleDatabaseError
} from '../../../utils/errorHandler';


export function getConfirmarEntregaErrorStatus(error: Error): number {
  const message = error.message
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const clientErrorFragments = [
    'client_operation_id',
    'nao encontrado',
    'nao esta marcado',
    'nao foi entregue',
    'ja foi entregue',
    'saldo insuficiente',
    'quantidade a entregar',
    'maior que o saldo pendente',
    'quantidade invalida',
  ];

  return clientErrorFragments.some((fragment) => message.includes(fragment)) ? 400 : 500;
}

export function parseRotaIdsParam(value: unknown): number[] | undefined {
  if (typeof value !== 'string' || value.trim() === '' || value === 'todas') {
    return undefined;
  }

  const ids = value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);

  return ids.length > 0 ? Array.from(new Set(ids)) : undefined;
}

class EntregaController {
  async obterOfflineBundle(req: Request, res: Response) {
    try {
      const { rotaIds, guiaId, dataEntrega, dataInicio, dataFim, somentePendentes } = req.query;

      const bundle = await EntregaModel.obterOfflineBundle({
        rotaIds: parseRotaIdsParam(rotaIds),
        guiaId: guiaId ? Number(guiaId) : undefined,
        dataEntrega: typeof dataEntrega === 'string' ? dataEntrega : undefined,
        dataInicio: typeof dataInicio === 'string' ? dataInicio : undefined,
        dataFim: typeof dataFim === 'string' ? dataFim : undefined,
        somentePendentes: somentePendentes === 'true',
      });

      res.json(bundle);
    } catch (error) {
      console.error('Erro ao montar bundle offline de entregas:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  async listarMudancas(req: Request, res: Response) {
    try {
      const { since } = req.query;
      const changes = await EntregaModel.listarMudancasEntregas(typeof since === 'string' ? since : undefined);
      res.json(changes);
    } catch (error) {
      console.error('Erro ao listar mudancas de entregas:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  async listarEscolas(req: Request, res: Response) {
    try {
      const { guiaId, rotaId, dataEntrega, dataInicio, dataFim, somentePendentes } = req.query;
      
      const escolas = await EntregaModel.listarEscolasComEntregas(
        guiaId ? Number(guiaId) : undefined,
        rotaId ? Number(rotaId) : undefined,
        typeof dataEntrega === 'string' ? dataEntrega : undefined,
        typeof dataInicio === 'string' ? dataInicio : undefined,
        typeof dataFim === 'string' ? dataFim : undefined,
        somentePendentes === 'true'
      );
      res.json(escolas);
    } catch (error) {
      console.error('Erro ao listar escolas com entregas:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async listarItensPorEscola(req: Request, res: Response) {
    try {
      const { escolaId } = req.params;
      const { guiaId, dataEntrega, dataInicio, dataFim, somentePendentes } = req.query;
      
      if (!escolaId || isNaN(Number(escolaId))) {
        return res.status(400).json({ error: 'ID da escola é obrigatório e deve ser um número' });
      }

      const itens = await EntregaModel.listarItensEntregaPorEscola(
        Number(escolaId),
        guiaId ? Number(guiaId) : undefined,
        typeof dataEntrega === 'string' ? dataEntrega : undefined,
        typeof dataInicio === 'string' ? dataInicio : undefined,
        typeof dataFim === 'string' ? dataFim : undefined,
        somentePendentes === 'true'
      );
      res.json(itens);
    } catch (error) {
      console.error('Erro ao listar itens para entrega:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async buscarItem(req: Request, res: Response) {
    try {
      const { itemId } = req.params;
      
      if (!itemId || isNaN(Number(itemId))) {
        return res.status(400).json({ error: 'ID do item é obrigatório e deve ser um número' });
      }

      const item = await EntregaModel.buscarItemEntrega(Number(itemId));
      
      if (!item) {
        return res.status(404).json({ error: 'Item não encontrado' });
      }

      res.json(item);
    } catch (error) {
      console.error('Erro ao buscar item:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async confirmarEntrega(req: Request, res: Response) {
    try {
      const { itemId } = req.params;
      const { 
        quantidade_entregue, 
        nome_quem_entregou, 
        nome_quem_recebeu,
        observacao,
        assinatura_base64,
        latitude,
        longitude,
        precisao_gps,
        client_operation_id
      } = req.body;

      if (!itemId || isNaN(Number(itemId))) {
        console.error('❌ ID do item inválido:', itemId);
        return res.status(400).json({ error: 'ID do item é obrigatório e deve ser um número' });
      }

      // Validações obrigatórias
      if (!quantidade_entregue || quantidade_entregue <= 0) {
        console.error('❌ Quantidade inválida:', quantidade_entregue);
        return res.status(400).json({ error: 'Quantidade entregue é obrigatória e deve ser maior que zero' });
      }

      if (!nome_quem_entregou || nome_quem_entregou.trim().length === 0) {
        console.error('❌ Nome do entregador vazio');
        return res.status(400).json({ error: 'Nome de quem entregou é obrigatório' });
      }

      if (!nome_quem_recebeu || nome_quem_recebeu.trim().length === 0) {
        console.error('❌ Nome do recebedor vazio');
        return res.status(400).json({ error: 'Nome de quem recebeu é obrigatório' });
      }

      // Validação de assinatura (opcional, mas recomendada)
      if (assinatura_base64 && !assinatura_base64.startsWith('data:image/') && !assinatura_base64.startsWith('file://')) {
        console.error('❌ Formato de assinatura inválido');
        return res.status(400).json({ error: 'Formato de assinatura inválido. Deve ser uma imagem em base64 ou URI' });
      }

      // Validação de localização (opcional, mas se enviada deve ser válida)
      if (latitude !== undefined && (isNaN(Number(latitude)) || Math.abs(Number(latitude)) > 90)) {
        console.error('❌ Latitude inválida:', latitude);
        return res.status(400).json({ error: 'Latitude deve ser um número válido entre -90 e 90' });
      }

      if (longitude !== undefined && (isNaN(Number(longitude)) || Math.abs(Number(longitude)) > 180)) {
        console.error('❌ Longitude inválida:', longitude);
        return res.status(400).json({ error: 'Longitude deve ser um número válido entre -180 e 180' });
      }


      const item = await EntregaModel.confirmarEntrega(Number(itemId), {
        quantidade_entregue: Number(quantidade_entregue),
        nome_quem_entregou: nome_quem_entregou.trim(),
        nome_quem_recebeu: nome_quem_recebeu.trim(),
        observacao: observacao?.trim() || null,
        assinatura_base64: assinatura_base64 || null,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        precisao_gps: precisao_gps ? Number(precisao_gps) : null,
        client_operation_id: typeof client_operation_id === 'string' ? client_operation_id : null
      });


      res.json({
        message: 'Entrega confirmada com sucesso',
        item,
        historico_id: item.historico_id
      });
    } catch (error) {
      console.error('❌ Erro ao confirmar entrega:', error);
      
      if (error instanceof Error) {
        return res.status(getConfirmarEntregaErrorStatus(error)).json({ error: error.message });
      }

      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async cancelarEntrega(req: Request, res: Response) {
    try {
      const { itemId } = req.params;

      if (!itemId || isNaN(Number(itemId))) {
        return res.status(400).json({ error: 'ID do item é obrigatório e deve ser um número' });
      }

      const item = await EntregaModel.cancelarEntrega(Number(itemId));

      res.json({
        message: 'Entrega cancelada com sucesso',
        item
      });
    } catch (error) {
      console.error('Erro ao cancelar entrega:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('não encontrado') || 
            error.message.includes('não foi entregue')) {
          return res.status(400).json({ error: error.message });
        }
      }

      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async obterEstatisticas(req: Request, res: Response) {
    try {
      const { guiaId, rotaId, dataEntrega, dataInicio, dataFim, somentePendentes } = req.query;
      
      const estatisticas = await EntregaModel.obterEstatisticasEntregas(
        guiaId ? Number(guiaId) : undefined,
        rotaId ? Number(rotaId) : undefined,
        typeof dataEntrega === 'string' ? dataEntrega : undefined,
        typeof dataInicio === 'string' ? dataInicio : undefined,
        typeof dataFim === 'string' ? dataFim : undefined,
        somentePendentes === 'true'
      );
      res.json(estatisticas);
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

}

export default new EntregaController();
