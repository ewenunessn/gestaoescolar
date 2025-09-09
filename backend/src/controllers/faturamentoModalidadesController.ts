import { Request, Response } from 'express';
import FaturamentoModalidadesService, { IParametrosFaturamento } from '../services/FaturamentoModalidadesService';
const db = require('../database');

export class FaturamentoModalidadesController {

  /**
   * Lista modalidades disponíveis para seleção
   */
  static async listarModalidadesDisponiveis(req: Request, res: Response) {
    try {
      const modalidades = await db.all(`
        SELECT id, nome, descricao, valor_repasse, ativo
        FROM modalidades
        WHERE ativo = 1
        ORDER BY nome
      `);

      res.json({
        success: true,
        data: modalidades,
        message: 'Modalidades disponíveis listadas com sucesso'
      });
    } catch (error) {
      console.error('Erro ao listar modalidades disponíveis:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Busca modalidades configuradas para um item específico
   */
  static async buscarModalidadesItem(req: Request, res: Response) {
    try {
      const { pedido_item_id } = req.params;

      if (!pedido_item_id) {
        return res.status(400).json({
          success: false,
          message: 'ID do item do pedido é obrigatório'
        });
      }

      const modalidadesQuery = `
        SELECT modalidade_id, percentual 
        FROM pedido_itens_modalidades_config 
        WHERE pedido_item_id = ?
      `;
      const modalidades = await db.query(modalidadesQuery, [parseInt(pedido_item_id)]);

      res.json({
        success: true,
        data: modalidades,
        message: 'Modalidades do item listadas com sucesso'
      });
    } catch (error) {
      console.error('Erro ao buscar modalidades do item:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Busca todos os itens de um pedido com suas modalidades configuradas
   */
  static async buscarItensPedidoComModalidades(req: Request, res: Response) {
    try {
      const { pedido_id } = req.params;

      if (!pedido_id) {
        return res.status(400).json({
          success: false,
          message: 'ID do pedido é obrigatório'
        });
      }

      const itensQuery = `
        SELECT DISTINCT pi.id as pedido_item_id, pi.produto_id, pi.quantidade, pi.valor_unitario,
               p.nome as nome_produto
        FROM pedido_itens pi
        JOIN produtos p ON pi.produto_id = p.id
        JOIN pedido_itens_modalidades_config pimc ON pi.id = pimc.pedido_item_id
        WHERE pi.pedido_id = ?
      `;
      const itens = await db.query(itensQuery, [parseInt(pedido_id)]);

      res.json({
        success: true,
        data: itens,
        message: 'Itens do pedido com modalidades listados com sucesso'
      });
    } catch (error) {
      console.error('Erro ao buscar itens do pedido com modalidades:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Configura modalidades para um item específico
   */
  static async configurarModalidadesItem(req: Request, res: Response) {
    try {
      const { pedido_item_id } = req.params;
      const { modalidades_ids } = req.body;

      if (!pedido_item_id) {
        return res.status(400).json({
          success: false,
          message: 'ID do item do pedido é obrigatório'
        });
      }

      if (!Array.isArray(modalidades_ids)) {
        return res.status(400).json({
          success: false,
          message: 'Lista de modalidades deve ser um array'
        });
      }

      // Verificar se o item do pedido existe
      const item = await db.get(`
        SELECT pi.*, p.nome as nome_produto
        FROM pedidos_itens pi
        JOIN produtos p ON pi.produto_id = p.id
        WHERE pi.id = $1
      `, [pedido_item_id]);

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Item do pedido não encontrado'
        });
      }

      // Verificar se todas as modalidades existem e estão ativas
      if (modalidades_ids.length > 0) {
        const modalidadesValidas = await db.all(`
          SELECT id FROM modalidades 
          WHERE id IN (${modalidades_ids.map(() => '?').join(',')}) AND ativo = 1
        `, modalidades_ids);

        if (modalidadesValidas.length !== modalidades_ids.length) {
          return res.status(400).json({
            success: false,
            message: 'Uma ou mais modalidades são inválidas ou inativas'
          });
        }
      }

      // Remover configurações existentes
        await db.query('DELETE FROM pedido_itens_modalidades_config WHERE pedido_item_id = ?', [parseInt(pedido_item_id)]);
        
        // Inserir novas configurações
        for (const modalidade of modalidades_ids) {
          await db.query(
            'INSERT INTO pedido_itens_modalidades_config (pedido_item_id, modalidade_id, percentual) VALUES (?, ?, ?)',
            [parseInt(pedido_item_id), modalidade.modalidade_id, modalidade.percentual]
          );
        }

      // Buscar configuração atualizada
      const modalidadesQuery = `
          SELECT modalidade_id, percentual 
          FROM pedido_itens_modalidades_config 
          WHERE pedido_item_id = ?
        `;
        const modalidadesAtualizadas = await db.query(modalidadesQuery, [parseInt(pedido_item_id)]);

      res.json({
        success: true,
        data: {
          pedido_item_id: parseInt(pedido_item_id),
          nome_produto: item.nome_produto,
          modalidades_configuradas: modalidadesAtualizadas
        },
        message: 'Modalidades configuradas com sucesso'
      });
    } catch (error) {
      console.error('Erro ao configurar modalidades do item:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Configura modalidades para múltiplos itens de um pedido
   */
  static async configurarModalidadesPedido(req: Request, res: Response) {
    try {
      const { pedido_id } = req.params;
      const { configuracoes } = req.body;

      if (!pedido_id) {
        return res.status(400).json({
          success: false,
          message: 'ID do pedido é obrigatório'
        });
      }

      if (!Array.isArray(configuracoes)) {
        return res.status(400).json({
          success: false,
          message: 'Configurações devem ser um array'
        });
      }

      // Validar estrutura das configurações
      for (const config of configuracoes) {
        if (!config.pedido_item_id || !Array.isArray(config.modalidades_ids)) {
          return res.status(400).json({
            success: false,
            message: 'Estrutura de configuração inválida. Esperado: {pedido_item_id: number, modalidades_ids: number[]}'
          });
        }
      }

      // Verificar se todos os itens pertencem ao pedido
      const itensIds = configuracoes.map(c => c.pedido_item_id);
      const itensValidos = await db.all(`
        SELECT id FROM pedidos_itens 
        WHERE id IN (${itensIds.map(() => '?').join(',')}) AND pedido_id = $${itensIds.length + 1}
      `, [...itensIds, pedido_id]);

      if (itensValidos.length !== itensIds.length) {
        return res.status(400).json({
          success: false,
          message: 'Um ou mais itens não pertencem ao pedido especificado'
        });
      }

      // Configurar modalidades para cada item do pedido
        for (const config of configuracoes) {
          // Remover configurações existentes
          await db.query('DELETE FROM pedido_itens_modalidades_config WHERE pedido_item_id = ?', [config.pedido_item_id]);
          
          // Inserir novas configurações
          for (const modalidade of config.modalidades) {
            await db.query(
              'INSERT INTO pedido_itens_modalidades_config (pedido_item_id, modalidade_id, percentual) VALUES (?, ?, ?)',
              [config.pedido_item_id, modalidade.modalidade_id, modalidade.percentual]
            );
          }
        }

      // Buscar configuração atualizada do pedido
      const itensQuery = `
          SELECT DISTINCT pi.id as pedido_item_id, pi.produto_id, pi.quantidade, pi.valor_unitario,
                 p.nome as nome_produto
          FROM pedido_itens pi
          JOIN produtos p ON pi.produto_id = p.id
          JOIN pedido_itens_modalidades_config pimc ON pi.id = pimc.pedido_item_id
          WHERE pi.pedido_id = ?
        `;
        const itensAtualizados = await db.query(itensQuery, [parseInt(pedido_id)]);

      res.json({
        success: true,
        data: {
          pedido_id: parseInt(pedido_id),
          itens_configurados: itensAtualizados
        },
        message: 'Modalidades do pedido configuradas com sucesso'
      });
    } catch (error) {
      console.error('Erro ao configurar modalidades do pedido:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Calcula prévia da divisão proporcional para um item
   */
  static async calcularPreviaItem(req: Request, res: Response) {
    try {
      const { pedido_item_id } = req.params;

      if (!pedido_item_id) {
        return res.status(400).json({
          success: false,
          message: 'ID do item do pedido é obrigatório'
        });
      }

      // Buscar informações do item
      const item = await db.get(`
        SELECT pi.*, p.nome as nome_produto
        FROM pedidos_itens pi
        JOIN produtos p ON pi.produto_id = p.id
        WHERE pi.id = $1
      `, [pedido_item_id]);

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Item do pedido não encontrado'
        });
      }

      // Verificar se tem modalidades configuradas
      const modalidadesCheckQuery = `
        SELECT COUNT(*) as count 
        FROM pedido_itens_modalidades_config 
        WHERE pedido_item_id = ?
      `;
      const result = await db.query(modalidadesCheckQuery, [parseInt(pedido_item_id)]);
      const temModalidades = result[0].count > 0;

      if (!temModalidades) {
        return res.status(400).json({
          success: false,
          message: 'Item não possui modalidades configuradas'
        });
      }

      const resultado = await FaturamentoModalidadesService.calcularDivisaoProporcionalItem(
        parseInt(pedido_item_id),
        item.quantidade,
        item.preco_unitario
      );

      res.json({
        success: true,
        data: resultado,
        message: 'Prévia de divisão calculada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao calcular prévia do item:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Calcula prévia da divisão proporcional para todo o pedido
   */
  static async calcularPreviaPedido(req: Request, res: Response) {
    try {
      const { pedido_id } = req.params;

      if (!pedido_id) {
        return res.status(400).json({
          success: false,
          message: 'ID do pedido é obrigatório'
        });
      }

      const resultado = await FaturamentoModalidadesService.calcularDivisaoProporcionalPedido(
        parseInt(pedido_id)
      );

      // Calcular resumo geral
      const resumo = {
        total_itens: resultado.length,
        quantidade_total: resultado.reduce((sum, item) => sum + item.quantidade_original, 0),
        valor_total: resultado.reduce((sum, item) => sum + item.valor_total_original, 0),
        modalidades_utilizadas: [...new Set(resultado.flatMap(item => 
          item.divisoes_modalidades.map(div => div.nome_modalidade)
        ))]
      };

      res.json({
        success: true,
        data: {
          divisoes: resultado,
          resumo
        },
        message: 'Prévia de divisão do pedido calculada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao calcular prévia do pedido:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Processa faturamento automático com divisão por modalidades
   */
  static async processarFaturamentoAutomatico(req: Request, res: Response) {
    try {
      const { pedido_id, fornecedor_id, contrato_id, observacoes } = req.body;

      if (!pedido_id || !fornecedor_id) {
        return res.status(400).json({
          success: false,
          message: 'ID do pedido e fornecedor são obrigatórios'
        });
      }

      const parametros: IParametrosFaturamento = {
        pedido_id: parseInt(pedido_id),
        fornecedor_id: parseInt(fornecedor_id),
        contrato_id: contrato_id ? parseInt(contrato_id) : undefined,
        observacoes
      };

      const resultado = await FaturamentoModalidadesService.processarFaturamentoAutomatico(parametros);

      res.json({
        success: true,
        data: resultado,
        message: 'Faturamento processado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao processar faturamento automático:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Busca relatório detalhado de um faturamento
   */
  static async buscarRelatorioFaturamento(req: Request, res: Response) {
    try {
      const { faturamento_id } = req.params;

      if (!faturamento_id) {
        return res.status(400).json({
          success: false,
          message: 'ID do faturamento é obrigatório'
        });
      }

      const relatorio = await FaturamentoModalidadesService.gerarRelatorioFaturamento(
        parseInt(faturamento_id)
      );

      res.json({
        success: true,
        data: relatorio,
        message: 'Relatório gerado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de faturamento:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Verifica se um pedido está pronto para faturamento automático
   */
  static async verificarProntoParaFaturamento(req: Request, res: Response) {
    try {
      const { pedido_id } = req.params;

      if (!pedido_id) {
        return res.status(400).json({
          success: false,
          message: 'ID do pedido é obrigatório'
        });
      }

      // Verificar se o pedido existe
      const pedido = await db.get(`
        SELECT pm.*, f.nome as nome_fornecedor
        FROM pedidos pm
        LEFT JOIN fornecedores f ON pm.fornecedor_id = f.id
        WHERE pm.id = $1
      `, [pedido_id]);

      if (!pedido) {
        return res.status(404).json({
          success: false,
          message: 'Pedido não encontrado'
        });
      }

      // Verificar status de entrega dos itens
      const statusEntrega = await db.get(`
        SELECT 
          COUNT(*) as total_itens,
          COUNT(CASE WHEN COALESCE(rs.quantidade_recebida_total, 0) >= pi.quantidade THEN 1 END) as itens_completos,
          COUNT(CASE WHEN COALESCE(rs.quantidade_recebida_total, 0) > 0 AND COALESCE(rs.quantidade_recebida_total, 0) < pi.quantidade THEN 1 END) as itens_parciais,
          COUNT(CASE WHEN COALESCE(rs.quantidade_recebida_total, 0) = 0 THEN 1 END) as itens_pendentes,
          SUM(pi.quantidade) as quantidade_total,
          SUM(COALESCE(rs.quantidade_recebida_total, 0)) as quantidade_recebida_total
        FROM pedidos_itens pi
        JOIN pedidos_fornecedores pf ON pi.pedido_fornecedor_id = pf.id
        LEFT JOIN (
          SELECT 
            pedido_item_id,
            SUM(quantidade_recebida) as quantidade_recebida_total
          FROM recebimentos_simples 
          GROUP BY pedido_item_id
        ) rs ON pi.id = rs.pedido_item_id
        WHERE pf.pedido_id = $1
      `, [pedido_id]);

      const prontoParaFaturamento = statusEntrega.total_itens > 0 && 
                                   statusEntrega.itens_completos === statusEntrega.total_itens;

      const percentualEntregue = statusEntrega.quantidade_total > 0 ? 
        (statusEntrega.quantidade_recebida_total / statusEntrega.quantidade_total) * 100 : 0;

      res.json({
        success: true,
        data: {
          pedido_id: parseInt(pedido_id),
          numero_pedido: pedido.numero_pedido,
          fornecedor: pedido.nome_fornecedor,
          pronto_para_faturamento: prontoParaFaturamento,
          status_entrega: {
            total_itens: statusEntrega.total_itens,
            itens_completos: statusEntrega.itens_completos,
            itens_parciais: statusEntrega.itens_parciais,
            itens_pendentes: statusEntrega.itens_pendentes,
            percentual_entregue: Math.round(percentualEntregue * 100) / 100
          },
          pode_processar: prontoParaFaturamento && statusEntrega.total_itens > 0
        },
        message: prontoParaFaturamento ? 
          'Pedido pronto para faturamento automático' : 
          'Pedido ainda não está completamente entregue'
      });
    } catch (error) {
      console.error('Erro ao verificar status para faturamento:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Lista pedidos prontos para faturamento automático
   */
  static async listarPedidosProntosParaFaturamento(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, fornecedor_id } = req.query;
      
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      
      if (fornecedor_id) {
        whereClause += ' AND pm.fornecedor_id = $' + (params.length + 1);
        params.push(fornecedor_id);
      }
      
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      // Buscar pedidos com entrega completa
      const pedidosProntos = await db.all(`
        SELECT 
          pm.id,
          pm.numero_pedido,
          pm.status,
          pm.valor_total,
          pm.created_at,
          f.nome as nome_fornecedor,
          COUNT(pi.id) as total_itens,
          COUNT(CASE WHEN COALESCE(rs.quantidade_recebida, 0) >= pi.quantidade THEN 1 END) as itens_completos,
          COUNT(CASE WHEN COALESCE(rs.quantidade_recebida, 0) > 0 AND COALESCE(rs.quantidade_recebida, 0) < pi.quantidade THEN 1 END) as itens_parciais,
          COUNT(CASE WHEN COALESCE(rs.quantidade_recebida, 0) = 0 THEN 1 END) as itens_pendentes,
          SUM(pi.quantidade) as quantidade_total,
          SUM(COALESCE(rs.quantidade_recebida, 0)) as quantidade_recebida_total,
          CASE 
            WHEN COUNT(pi.id) > 0 AND COUNT(CASE WHEN COALESCE(rs.quantidade_recebida, 0) >= pi.quantidade THEN 1 END) = COUNT(pi.id)
            THEN 'PRONTO'
            ELSE 'PENDENTE'
          END as status_faturamento
        FROM pedidos pm
        JOIN pedidos_fornecedores pf ON pm.id = pf.pedido_id
        JOIN pedidos_itens pi ON pf.id = pi.pedido_fornecedor_id
        JOIN fornecedores f ON pf.fornecedor_id = f.id
        LEFT JOIN (
          SELECT pedido_item_id, SUM(quantidade_recebida) as quantidade_recebida
          FROM recebimentos_simples
          GROUP BY pedido_item_id
        ) rs ON pi.id = rs.pedido_item_id
        ${whereClause}
        GROUP BY pm.id, pm.numero_pedido, pm.status, pm.valor_total, pm.created_at, f.nome
        HAVING COUNT(pi.id) > 0 AND COUNT(CASE WHEN COALESCE(rs.quantidade_recebida, 0) >= pi.quantidade THEN 1 END) = COUNT(pi.id)
        ORDER BY pm.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, limit, offset]);
      
      const total = await db.get(`
        SELECT COUNT(*) as total
        FROM (
          SELECT pm.id
          FROM pedidos pm
          JOIN pedidos_fornecedores pf ON pm.id = pf.pedido_id
          JOIN pedidos_itens pi ON pf.id = pi.pedido_fornecedor_id
          JOIN fornecedores f ON pf.fornecedor_id = f.id
          LEFT JOIN (
            SELECT pedido_item_id, SUM(quantidade_recebida) as quantidade_recebida
            FROM recebimentos_simples
            GROUP BY pedido_item_id
          ) rs ON pi.id = rs.pedido_item_id
          ${whereClause}
          GROUP BY pm.id
          HAVING COUNT(pi.id) > 0 AND COUNT(CASE WHEN COALESCE(rs.quantidade_recebida, 0) >= pi.quantidade THEN 1 END) = COUNT(pi.id)
        ) subquery
      `, params);

      res.json({
        success: true,
        data: {
          pedidos: pedidosProntos.map(pedido => ({
            ...pedido,
            percentual_entregue: pedido.quantidade_total > 0 ? 
              Math.round((pedido.quantidade_recebida_total / pedido.quantidade_total) * 100 * 100) / 100 : 0
          })),
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: total?.total || 0,
            pages: Math.ceil((total?.total || 0) / parseInt(limit as string))
          }
        },
        message: 'Pedidos prontos para faturamento listados com sucesso'
      });
    } catch (error) {
      console.error('Erro ao listar pedidos prontos para faturamento:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Lista faturamentos com divisão por modalidades
   */
  static async listarFaturamentosModalidades(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, fornecedor_id, periodo_inicio, periodo_fim } = req.query;
      
      let whereClause = 'WHERE EXISTS (SELECT 1 FROM faturamento_itens_modalidades fim WHERE fim.faturamento_id = f.id)';
      const params: any[] = [];
      
      if (fornecedor_id) {
        whereClause += ' AND f.fornecedor_id = $' + (params.length + 1);
        params.push(fornecedor_id);
      }
      
      if (periodo_inicio && periodo_fim) {
        whereClause += ' AND f.created_at BETWEEN $' + (params.length + 1) + ' AND $' + (params.length + 2);
        params.push(periodo_inicio, periodo_fim);
      }
      
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      const faturamentos = await db.all(`
        SELECT 
          f.*,
          p.numero as numero_pedido,
          fo.nome as nome_fornecedor,
          c.numero as numero_contrato,
          COUNT(DISTINCT fim.modalidade_id) as total_modalidades,
          COUNT(fim.id) as total_itens_modalidades
        FROM faturamentos f
        JOIN pedidos p ON f.pedido_id = p.id
        JOIN fornecedores fo ON f.fornecedor_id = fo.id
        LEFT JOIN contratos c ON f.contrato_id = c.id
        LEFT JOIN faturamento_itens_modalidades fim ON f.id = fim.faturamento_id
        ${whereClause}
        GROUP BY f.id
        ORDER BY f.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, limit, offset]);
      
      const total = await db.get(`
        SELECT COUNT(DISTINCT f.id) as total
        FROM faturamentos f
        ${whereClause}
      `, params);

      res.json({
        success: true,
        data: {
          faturamentos,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: total.total,
            pages: Math.ceil(total.total / parseInt(limit as string))
          }
        },
        message: 'Faturamentos listados com sucesso'
      });
    } catch (error) {
      console.error('Erro ao listar faturamentos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}

export default FaturamentoModalidadesController;