import { Request, Response } from 'express';
import EntregaModel from '../models/Entrega';

class EntregaController {
  async listarEscolas(req: Request, res: Response) {
    try {
      const escolas = await EntregaModel.listarEscolasComEntregas();
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
      
      if (!escolaId || isNaN(Number(escolaId))) {
        return res.status(400).json({ error: 'ID da escola é obrigatório e deve ser um número' });
      }

      const itens = await EntregaModel.listarItensEntregaPorEscola(Number(escolaId));
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
      const { quantidade_entregue, nome_quem_entregou, nome_quem_recebeu } = req.body;

      if (!itemId || isNaN(Number(itemId))) {
        return res.status(400).json({ error: 'ID do item é obrigatório e deve ser um número' });
      }

      // Validações
      if (!quantidade_entregue || quantidade_entregue <= 0) {
        return res.status(400).json({ error: 'Quantidade entregue é obrigatória e deve ser maior que zero' });
      }

      if (!nome_quem_entregou || nome_quem_entregou.trim().length === 0) {
        return res.status(400).json({ error: 'Nome de quem entregou é obrigatório' });
      }

      if (!nome_quem_recebeu || nome_quem_recebeu.trim().length === 0) {
        return res.status(400).json({ error: 'Nome de quem recebeu é obrigatório' });
      }

      const item = await EntregaModel.confirmarEntrega(Number(itemId), {
        quantidade_entregue: Number(quantidade_entregue),
        nome_quem_entregou: nome_quem_entregou.trim(),
        nome_quem_recebeu: nome_quem_recebeu.trim()
      });

      res.json({
        message: 'Entrega confirmada com sucesso',
        item
      });
    } catch (error) {
      console.error('Erro ao confirmar entrega:', error);
      
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
      const estatisticas = await EntregaModel.obterEstatisticasEntregas();
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