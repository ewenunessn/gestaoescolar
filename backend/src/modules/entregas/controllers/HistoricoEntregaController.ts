import { Request, Response } from 'express';
import HistoricoEntregaModel from '../models/HistoricoEntrega';

class HistoricoEntregaController {
  /**
   * Listar histórico de entregas de um item
   * GET /api/entregas/itens/:itemId/historico
   */
  async listarPorItem(req: Request, res: Response) {
    try {
      const { itemId } = req.params;

      if (!itemId || isNaN(Number(itemId))) {
        return res.status(400).json({ error: 'ID do item é obrigatório e deve ser um número' });
      }

      const historico = await HistoricoEntregaModel.listarPorItem(Number(itemId));
      
      res.json(historico);
    } catch (error) {
      console.error('Erro ao listar histórico de entregas:', error);
      res.status(500).json({ error: 'Erro ao listar histórico de entregas' });
    }
  }

  /**
   * Listar histórico de entregas de uma escola
   * GET /api/entregas/escolas/:escolaId/historico
   */
  async listarPorEscola(req: Request, res: Response) {
    try {
      const { escolaId } = req.params;
      const { guiaId } = req.query;

      if (!escolaId || isNaN(Number(escolaId))) {
        return res.status(400).json({ error: 'ID da escola é obrigatório e deve ser um número' });
      }

      const historico = await HistoricoEntregaModel.listarPorEscola(
        Number(escolaId),
        guiaId ? Number(guiaId) : undefined
      );
      
      res.json(historico);
    } catch (error) {
      console.error('Erro ao listar histórico de entregas:', error);
      res.status(500).json({ error: 'Erro ao listar histórico de entregas' });
    }
  }

  /**
   * Buscar item com histórico completo
   * GET /api/entregas/itens/:itemId/completo
   */
  async buscarItemComHistorico(req: Request, res: Response) {
    try {
      const { itemId } = req.params;

      if (!itemId || isNaN(Number(itemId))) {
        return res.status(400).json({ error: 'ID do item é obrigatório e deve ser um número' });
      }

      const item = await HistoricoEntregaModel.buscarItemComHistorico(Number(itemId));
      
      if (!item) {
        return res.status(404).json({ error: 'Item não encontrado' });
      }

      res.json(item);
    } catch (error) {
      console.error('Erro ao buscar item com histórico:', error);
      res.status(500).json({ error: 'Erro ao buscar item com histórico' });
    }
  }

  /**
   * Listar itens de uma escola com histórico
   * GET /api/entregas/escolas/:escolaId/itens-completo
   */
  async listarItensComHistorico(req: Request, res: Response) {
    try {
      const { escolaId } = req.params;
      const { guiaId } = req.query;

      if (!escolaId || isNaN(Number(escolaId))) {
        return res.status(400).json({ error: 'ID da escola é obrigatório e deve ser um número' });
      }

      const itens = await HistoricoEntregaModel.listarItensComHistorico(
        Number(escolaId),
        guiaId ? Number(guiaId) : undefined
      );
      
      res.json(itens);
    } catch (error) {
      console.error('Erro ao listar itens com histórico:', error);
      res.status(500).json({ error: 'Erro ao listar itens com histórico' });
    }
  }

  /**
   * Calcular saldo de um item
   * GET /api/entregas/itens/:itemId/saldo
   */
  async calcularSaldo(req: Request, res: Response) {
    try {
      const { itemId } = req.params;

      if (!itemId || isNaN(Number(itemId))) {
        return res.status(400).json({ error: 'ID do item é obrigatório e deve ser um número' });
      }

      const saldo = await HistoricoEntregaModel.calcularSaldo(Number(itemId));
      
      res.json(saldo);
    } catch (error) {
      console.error('Erro ao calcular saldo:', error);
      res.status(500).json({ error: 'Erro ao calcular saldo' });
    }
  }

  /**
   * Deletar um registro de entrega (apenas para correções)
   * DELETE /api/entregas/historico/:id
   */
  async deletar(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id || isNaN(Number(id))) {
        return res.status(400).json({ error: 'ID do histórico é obrigatório e deve ser um número' });
      }

      await HistoricoEntregaModel.deletar(Number(id));
      
      res.json({ message: 'Registro de entrega deletado com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar registro de entrega:', error);
      res.status(500).json({ error: 'Erro ao deletar registro de entrega' });
    }
  }
}

export default new HistoricoEntregaController();
