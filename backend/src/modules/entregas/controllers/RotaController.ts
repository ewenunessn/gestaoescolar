import { Request, Response } from 'express';
import RotaModel from '../models/Rota';

class RotaController {
  // Rotas de Entrega
  async listarRotas(req: Request, res: Response) {
    try {
      const rotas = await RotaModel.listarRotas();
      res.json(rotas);
    } catch (error) {
      console.error('Erro ao listar rotas:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async buscarRota(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(Number(id))) {
        return res.status(400).json({ error: 'ID da rota é obrigatório e deve ser um número' });
      }

      const rota = await RotaModel.buscarRota(Number(id));
      
      if (!rota) {
        return res.status(404).json({ error: 'Rota não encontrada' });
      }

      res.json(rota);
    } catch (error) {
      console.error('Erro ao buscar rota:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async criarRota(req: Request, res: Response) {
    try {
      const { nome, descricao, cor } = req.body;

      if (!nome || nome.trim().length === 0) {
        return res.status(400).json({ error: 'Nome da rota é obrigatório' });
      }

      const rota = await RotaModel.criarRota({
        nome: nome.trim(),
        descricao: descricao?.trim(),
        cor: cor || '#1976d2'
      });

      res.status(201).json({
        message: 'Rota criada com sucesso',
        rota
      });
    } catch (error) {
      console.error('Erro ao criar rota:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async atualizarRota(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { nome, descricao, cor } = req.body;

      if (!id || isNaN(Number(id))) {
        return res.status(400).json({ error: 'ID da rota é obrigatório e deve ser um número' });
      }

      const rota = await RotaModel.atualizarRota(Number(id), {
        nome: nome?.trim(),
        descricao: descricao?.trim(),
        cor
      });

      res.json({
        message: 'Rota atualizada com sucesso',
        rota
      });
    } catch (error) {
      console.error('Erro ao atualizar rota:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async deletarRota(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id || isNaN(Number(id))) {
        return res.status(400).json({ error: 'ID da rota é obrigatório e deve ser um número' });
      }

      const sucesso = await RotaModel.deletarRota(Number(id));

      if (!sucesso) {
        return res.status(404).json({ error: 'Rota não encontrada' });
      }

      res.json({ message: 'Rota desativada com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar rota:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Escolas da Rota
  async listarEscolasRota(req: Request, res: Response) {
    try {
      const { rotaId } = req.params;

      if (!rotaId || isNaN(Number(rotaId))) {
        return res.status(400).json({ error: 'ID da rota é obrigatório e deve ser um número' });
      }

      const escolas = await RotaModel.listarEscolasRota(Number(rotaId));
      res.json(escolas);
    } catch (error) {
      console.error('Erro ao listar escolas da rota:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async adicionarEscolaRota(req: Request, res: Response) {
    try {
      const { rotaId } = req.params;
      const { escolaId, ordem, observacao } = req.body;

      if (!rotaId || isNaN(Number(rotaId))) {
        return res.status(400).json({ error: 'ID da rota é obrigatório e deve ser um número' });
      }

      if (!escolaId || isNaN(Number(escolaId))) {
        return res.status(400).json({ error: 'ID da escola é obrigatório e deve ser um número' });
      }

      const escolaRota = await RotaModel.adicionarEscolaRota(
        Number(rotaId),
        Number(escolaId),
        ordem ? Number(ordem) : undefined,
        observacao
      );

      res.status(201).json({
        message: 'Escola adicionada à rota com sucesso',
        escolaRota
      });
    } catch (error) {
      console.error('Erro ao adicionar escola à rota:', error);
      
      if (error instanceof Error && error.message.includes('já está associada')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async removerEscolaRota(req: Request, res: Response) {
    try {
      const { rotaId, escolaId } = req.params;

      if (!rotaId || isNaN(Number(rotaId))) {
        return res.status(400).json({ error: 'ID da rota é obrigatório e deve ser um número' });
      }

      if (!escolaId || isNaN(Number(escolaId))) {
        return res.status(400).json({ error: 'ID da escola é obrigatório e deve ser um número' });
      }

      const sucesso = await RotaModel.removerEscolaRota(Number(rotaId), Number(escolaId));

      if (!sucesso) {
        return res.status(404).json({ error: 'Associação não encontrada' });
      }

      res.json({ message: 'Escola removida da rota com sucesso' });
    } catch (error) {
      console.error('Erro ao remover escola da rota:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async atualizarOrdemEscolas(req: Request, res: Response) {
    try {
      const { rotaId } = req.params;
      const { escolasOrdem } = req.body;

      if (!rotaId || isNaN(Number(rotaId))) {
        return res.status(400).json({ error: 'ID da rota é obrigatório e deve ser um número' });
      }

      if (!Array.isArray(escolasOrdem)) {
        return res.status(400).json({ error: 'escolasOrdem deve ser um array' });
      }

      const sucesso = await RotaModel.atualizarOrdemEscolas(Number(rotaId), escolasOrdem);

      if (!sucesso) {
        return res.status(400).json({ error: 'Erro ao atualizar ordem das escolas' });
      }

      res.json({ message: 'Ordem das escolas atualizada com sucesso' });
    } catch (error) {
      console.error('Erro ao atualizar ordem das escolas:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Planejamento de Entregas
  async listarPlanejamentos(req: Request, res: Response) {
    try {
      const { guiaId, rotaId } = req.query;

      const planejamentos = await RotaModel.listarPlanejamentos(
        guiaId ? Number(guiaId) : undefined,
        rotaId ? Number(rotaId) : undefined
      );

      res.json(planejamentos);
    } catch (error) {
      console.error('Erro ao listar planejamentos:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async criarPlanejamento(req: Request, res: Response) {
    try {
      const { guiaId, rotaId, dataPlanejada, responsavel, observacao } = req.body;

      if (!guiaId || isNaN(Number(guiaId))) {
        return res.status(400).json({ error: 'ID da guia é obrigatório e deve ser um número' });
      }

      if (!rotaId || isNaN(Number(rotaId))) {
        return res.status(400).json({ error: 'ID da rota é obrigatório e deve ser um número' });
      }

      const planejamento = await RotaModel.criarPlanejamento({
        guia_id: Number(guiaId),
        rota_id: Number(rotaId),
        data_planejada: dataPlanejada,
        responsavel: responsavel?.trim(),
        observacao: observacao?.trim()
      });

      res.status(201).json({
        message: 'Planejamento criado com sucesso',
        planejamento
      });
    } catch (error) {
      console.error('Erro ao criar planejamento:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async atualizarPlanejamento(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { dataPlanejada, responsavel, observacao, status } = req.body;

      if (!id || isNaN(Number(id))) {
        return res.status(400).json({ error: 'ID do planejamento é obrigatório e deve ser um número' });
      }

      const planejamento = await RotaModel.atualizarPlanejamento(Number(id), {
        data_planejada: dataPlanejada,
        responsavel: responsavel?.trim(),
        observacao: observacao?.trim(),
        status
      });

      res.json({
        message: 'Planejamento atualizado com sucesso',
        planejamento
      });
    } catch (error) {
      console.error('Erro ao atualizar planejamento:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async deletarPlanejamento(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id || isNaN(Number(id))) {
        return res.status(400).json({ error: 'ID do planejamento é obrigatório e deve ser um número' });
      }

      const sucesso = await RotaModel.deletarPlanejamento(Number(id));

      if (!sucesso) {
        return res.status(404).json({ error: 'Planejamento não encontrado' });
      }

      res.json({ message: 'Planejamento removido com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar planejamento:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Escolas disponíveis
  async listarEscolasDisponiveis(req: Request, res: Response) {
    try {
      const escolas = await RotaModel.listarEscolasDisponiveis();
      res.json(escolas);
    } catch (error) {
      console.error('Erro ao listar escolas disponíveis:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async verificarEscolaEmRota(req: Request, res: Response) {
    try {
      const { escolaId } = req.params;

      if (!escolaId || isNaN(Number(escolaId))) {
        return res.status(400).json({ error: 'ID da escola é obrigatório e deve ser um número' });
      }

      const resultado = await RotaModel.verificarEscolaEmRota(Number(escolaId));
      res.json(resultado);
    } catch (error) {
      console.error('Erro ao verificar escola em rota:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Para o módulo de entregas
  async listarRotasComEntregas(req: Request, res: Response) {
    try {
      const { guiaId } = req.query;

      const rotas = await RotaModel.listarRotasComEntregas(
        guiaId ? Number(guiaId) : undefined
      );

      res.json(rotas);
    } catch (error) {
      console.error('Erro ao listar rotas com entregas:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}

export default new RotaController();