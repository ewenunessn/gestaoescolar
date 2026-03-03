import { Request, Response } from 'express';
import EstoqueCentralModel from '../models/EstoqueCentral';

class EstoqueCentralController {
  /**
   * Listar estoque central
   * GET /api/estoque-central
   */
  async listar(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const estoque = await EstoqueCentralModel.listar(limit, offset);

      res.json({
        estoque,
        limit,
        offset
      });
    } catch (error: any) {
      console.error('Erro ao listar estoque central:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Buscar estoque por produto
   * GET /api/estoque-central/produto/:produtoId
   */
  async buscarPorProduto(req: Request, res: Response) {
    try {
      const { produtoId } = req.params;
      const estoque = await EstoqueCentralModel.buscarPorProduto(parseInt(produtoId));

      if (!estoque) {
        return res.status(404).json({ error: 'Produto não encontrado no estoque' });
      }

      res.json(estoque);
    } catch (error: any) {
      console.error('Erro ao buscar estoque:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Registrar entrada de estoque
   * POST /api/estoque-central/entrada
   */
  async registrarEntrada(req: Request, res: Response) {
    try {
      const {
        produto_id,
        quantidade,
        lote,
        data_fabricacao,
        data_validade,
        motivo,
        observacao,
        documento,
        fornecedor,
        nota_fiscal
      } = req.body;

      // Validações
      if (!produto_id || !quantidade) {
        return res.status(400).json({
          error: 'Campos obrigatórios: produto_id, quantidade'
        });
      }

      if (quantidade <= 0) {
        return res.status(400).json({
          error: 'Quantidade deve ser maior que zero'
        });
      }

      // Se informou lote, deve informar validade
      if (lote && !data_validade) {
        return res.status(400).json({
          error: 'Ao informar lote, é obrigatório informar a data de validade'
        });
      }

      const movimentacao = await EstoqueCentralModel.registrarEntrada({
        produto_id,
        quantidade,
        lote,
        data_fabricacao,
        data_validade,
        motivo,
        observacao,
        documento,
        fornecedor,
        nota_fiscal,
        usuario_id: (req as any).user?.id,
        usuario_nome: (req as any).user?.nome
      });

      res.status(201).json(movimentacao);
    } catch (error: any) {
      console.error('Erro ao registrar entrada:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Registrar saída de estoque
   * POST /api/estoque-central/saida
   */
  async registrarSaida(req: Request, res: Response) {
    try {
      const {
        produto_id,
        quantidade,
        lote_id,
        motivo,
        observacao,
        documento
      } = req.body;

      // Validações
      if (!produto_id || !quantidade) {
        return res.status(400).json({
          error: 'Campos obrigatórios: produto_id, quantidade'
        });
      }

      if (quantidade <= 0) {
        return res.status(400).json({
          error: 'Quantidade deve ser maior que zero'
        });
      }

      const movimentacao = await EstoqueCentralModel.registrarSaida({
        produto_id,
        quantidade,
        lote_id,
        motivo,
        observacao,
        documento,
        usuario_id: (req as any).user?.id,
        usuario_nome: (req as any).user?.nome
      });

      res.status(201).json(movimentacao);
    } catch (error: any) {
      console.error('Erro ao registrar saída:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Registrar ajuste de estoque
   * POST /api/estoque-central/ajuste
   */
  async registrarAjuste(req: Request, res: Response) {
    try {
      const {
        produto_id,
        quantidade_nova,
        lote_id,
        motivo,
        observacao
      } = req.body;

      // Validações
      if (!produto_id || quantidade_nova === undefined || !motivo) {
        return res.status(400).json({
          error: 'Campos obrigatórios: produto_id, quantidade_nova, motivo'
        });
      }

      if (quantidade_nova < 0) {
        return res.status(400).json({
          error: 'Quantidade não pode ser negativa'
        });
      }

      const movimentacao = await EstoqueCentralModel.registrarAjuste({
        produto_id,
        quantidade_nova,
        lote_id,
        motivo,
        observacao,
        usuario_id: (req as any).user?.id,
        usuario_nome: (req as any).user?.nome
      });

      res.status(201).json(movimentacao);
    } catch (error: any) {
      console.error('Erro ao registrar ajuste:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Listar lotes de um produto
   * GET /api/estoque-central/:estoqueId/lotes
   */
  async listarLotes(req: Request, res: Response) {
    try {
      const { estoqueId } = req.params;
      const lotes = await EstoqueCentralModel.listarLotes(parseInt(estoqueId));

      res.json({ lotes });
    } catch (error: any) {
      console.error('Erro ao listar lotes:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Listar lotes próximos do vencimento
   * GET /api/estoque-central/alertas/vencimento?dias=30
   */
  async listarLotesProximosVencimento(req: Request, res: Response) {
    try {
      const dias = parseInt(req.query.dias as string) || 30;
      const lotes = await EstoqueCentralModel.listarLotesProximosVencimento(dias);

      res.json({ lotes, dias });
    } catch (error: any) {
      console.error('Erro ao listar lotes próximos do vencimento:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Listar produtos com estoque baixo
   * GET /api/estoque-central/alertas/estoque-baixo
   */
  async listarEstoqueBaixo(req: Request, res: Response) {
    try {
      const produtos = await EstoqueCentralModel.listarEstoqueBaixo();

      res.json({ produtos });
    } catch (error: any) {
      console.error('Erro ao listar estoque baixo:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Listar movimentações
   * GET /api/estoque-central/movimentacoes?estoque_id=1&tipo=entrada&data_inicio=2026-01-01&data_fim=2026-12-31
   */
  async listarMovimentacoes(req: Request, res: Response) {
    try {
      const estoqueId = req.query.estoque_id ? parseInt(req.query.estoque_id as string) : undefined;
      const tipo = req.query.tipo as string;
      const dataInicio = req.query.data_inicio as string;
      const dataFim = req.query.data_fim as string;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const movimentacoes = await EstoqueCentralModel.listarMovimentacoes(
        estoqueId,
        tipo,
        dataInicio,
        dataFim,
        limit,
        offset
      );

      res.json({
        movimentacoes,
        limit,
        offset
      });
    } catch (error: any) {
      console.error('Erro ao listar movimentações:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new EstoqueCentralController();
