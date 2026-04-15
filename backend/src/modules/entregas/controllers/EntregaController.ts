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


class EntregaController {
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
        precisao_gps
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
        precisao_gps: precisao_gps ? Number(precisao_gps) : null
      });


      res.json({
        message: 'Entrega confirmada com sucesso',
        item,
        historico_id: item.historico_id
      });
    } catch (error) {
      console.error('❌ Erro ao confirmar entrega:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('não encontrado') || 
            error.message.includes('não está marcado') || 
            error.message.includes('já foi entregue')) {
          return res.status(400).json({ error: error.message });
        }
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
