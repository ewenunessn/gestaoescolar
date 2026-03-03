import { Request, Response } from 'express';
import ComprovanteEntregaModel from '../models/ComprovanteEntrega';

class ComprovanteEntregaController {
  /**
   * Criar um novo comprovante de entrega
   * POST /api/comprovantes
   */
  async criar(req: Request, res: Response) {
    try {
      const {
        escola_id,
        nome_quem_entregou,
        nome_quem_recebeu,
        cargo_recebedor,
        observacao,
        assinatura_base64,
        latitude,
        longitude,
        precisao_gps,
        itens
      } = req.body;

      // Validações
      if (!escola_id || !nome_quem_entregou || !nome_quem_recebeu) {
        return res.status(400).json({
          error: 'Campos obrigatórios: escola_id, nome_quem_entregou, nome_quem_recebeu'
        });
      }

      if (!itens || !Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({
          error: 'É necessário informar pelo menos um item'
        });
      }

      // Validar estrutura dos itens
      for (const item of itens) {
        if (!item.historico_entrega_id || !item.produto_nome || !item.quantidade_entregue || !item.unidade) {
          return res.status(400).json({
            error: 'Cada item deve ter: historico_entrega_id, produto_nome, quantidade_entregue, unidade'
          });
        }
      }

      const comprovante = await ComprovanteEntregaModel.criar({
        escola_id,
        nome_quem_entregou,
        nome_quem_recebeu,
        cargo_recebedor,
        observacao,
        assinatura_base64,
        latitude,
        longitude,
        precisao_gps,
        itens
      });

      // Buscar comprovante completo
      const comprovanteCompleto = await ComprovanteEntregaModel.buscarPorId(comprovante.id);

      res.status(201).json(comprovanteCompleto);
    } catch (error: any) {
      console.error('Erro ao criar comprovante:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Buscar comprovante por ID
   * GET /api/comprovantes/:id
   */
  async buscarPorId(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const comprovante = await ComprovanteEntregaModel.buscarPorId(parseInt(id));

      if (!comprovante) {
        return res.status(404).json({ error: 'Comprovante não encontrado' });
      }

      res.json(comprovante);
    } catch (error: any) {
      console.error('Erro ao buscar comprovante:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Buscar comprovante por número
   * GET /api/comprovantes/numero/:numero
   */
  async buscarPorNumero(req: Request, res: Response) {
    try {
      const { numero } = req.params;
      const comprovante = await ComprovanteEntregaModel.buscarPorNumero(numero);

      if (!comprovante) {
        return res.status(404).json({ error: 'Comprovante não encontrado' });
      }

      res.json(comprovante);
    } catch (error: any) {
      console.error('Erro ao buscar comprovante:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Listar comprovantes de uma escola
   * GET /api/comprovantes/escola/:escolaId
   */
  async listarPorEscola(req: Request, res: Response) {
    try {
      const { escolaId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const comprovantes = await ComprovanteEntregaModel.listarPorEscola(
        parseInt(escolaId),
        limit,
        offset
      );

      const total = await ComprovanteEntregaModel.contarPorEscola(parseInt(escolaId));

      res.json({
        comprovantes,
        total,
        limit,
        offset
      });
    } catch (error: any) {
      console.error('Erro ao listar comprovantes:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Listar todos os comprovantes
   * GET /api/comprovantes?data_inicio=YYYY-MM-DD&data_fim=YYYY-MM-DD
   */
  async listar(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const dataInicio = req.query.data_inicio as string;
      const dataFim = req.query.data_fim as string;

      const comprovantes = await ComprovanteEntregaModel.listar(limit, offset, dataInicio, dataFim);

      res.json({
        comprovantes,
        limit,
        offset
      });
    } catch (error: any) {
      console.error('Erro ao listar comprovantes:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Cancelar um comprovante
   * DELETE /api/comprovantes/:id
   */
  async cancelar(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Verificar se existe
      const comprovante = await ComprovanteEntregaModel.buscarPorId(parseInt(id));
      if (!comprovante) {
        return res.status(404).json({ error: 'Comprovante não encontrado' });
      }

      await ComprovanteEntregaModel.cancelar(parseInt(id));

      res.json({ message: 'Comprovante cancelado com sucesso' });
    } catch (error: any) {
      console.error('Erro ao cancelar comprovante:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Excluir permanentemente um comprovante
   * DELETE /api/comprovantes/:id/excluir
   */
  async excluir(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Verificar se existe
      const comprovante = await ComprovanteEntregaModel.buscarPorId(parseInt(id));
      if (!comprovante) {
        return res.status(404).json({ error: 'Comprovante não encontrado' });
      }

      await ComprovanteEntregaModel.excluir(parseInt(id));

      res.json({ message: 'Comprovante excluído permanentemente com sucesso' });
    } catch (error: any) {
      console.error('Erro ao excluir comprovante:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new ComprovanteEntregaController();
