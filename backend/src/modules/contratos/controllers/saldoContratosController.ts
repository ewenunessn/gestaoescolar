import { Request, Response } from 'express';
const db = require('../../../database');

/**
 * Controller para gerenciar consultas de saldos de contratos
 */
class SaldoContratosController {
  /**
   * Lista todos os itens de contratos com seus saldos
   * GET /api/saldos-contratos
   */
  async listarTodosSaldos(req: Request, res: Response): Promise<void> {
    try {
      const { 
        page = 1, 
        limit = 50, 
        status, 
        contrato_numero, 
        produto_nome,
        fornecedor_id 
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      // Query base
      let query = `
        SELECT 
          v.*,
          f.nome as fornecedor_nome,
          f.id as fornecedor_id
        FROM view_saldo_contratos_itens v
        JOIN contratos c ON v.contrato_id = c.id
        JOIN fornecedores f ON c.fornecedor_id = f.id
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramIndex = 1;
      
      // Filtros opcionais
      if (status) {
        query += ` AND v.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      
      if (contrato_numero) {
        query += ` AND v.contrato_numero ILIKE $${paramIndex}`;
        params.push(`%${contrato_numero}%`);
        paramIndex++;
      }
      
      if (produto_nome) {
        query += ` AND v.produto_nome ILIKE $${paramIndex}`;
        params.push(`%${produto_nome}%`);
        paramIndex++;
      }
      
      if (fornecedor_id) {
        query += ` AND f.id = $${paramIndex}`;
        params.push(parseInt(fornecedor_id as string));
        paramIndex++;
      }
      
      // Ordenação e paginação
      query += ` ORDER BY v.contrato_numero, v.produto_nome`;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit as string), offset);
      
      const result = await db.query(query, params);
      
      // Query para contar total de registros
      let countQuery = `
        SELECT COUNT(*) as total
        FROM view_saldo_contratos_itens v
        JOIN contratos c ON v.contrato_id = c.id
        JOIN fornecedores f ON c.fornecedor_id = f.id
        WHERE 1=1
      `;
      
      const countParams: any[] = [];
      let countParamIndex = 1;
      
      if (status) {
        countQuery += ` AND v.status = $${countParamIndex}`;
        countParams.push(status);
        countParamIndex++;
      }
      
      if (contrato_numero) {
        countQuery += ` AND v.contrato_numero ILIKE $${countParamIndex}`;
        countParams.push(`%${contrato_numero}%`);
        countParamIndex++;
      }
      
      if (produto_nome) {
        countQuery += ` AND v.produto_nome ILIKE $${countParamIndex}`;
        countParams.push(`%${produto_nome}%`);
        countParamIndex++;
      }
      
      if (fornecedor_id) {
        countQuery += ` AND f.id = $${countParamIndex}`;
        countParams.push(parseInt(fornecedor_id as string));
        countParamIndex++;
      }
      
      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      
      // Calcular estatísticas gerais
      const statsQuery = `
        SELECT 
          COUNT(*) as total_itens,
          COUNT(CASE WHEN v.status = 'DISPONIVEL' THEN 1 END) as itens_disponiveis,
          COUNT(CASE WHEN v.status = 'BAIXO_ESTOQUE' THEN 1 END) as itens_baixo_estoque,
          COUNT(CASE WHEN v.status = 'ESGOTADO' THEN 1 END) as itens_esgotados,
          SUM(v.quantidade_total) as quantidade_total_geral,
          SUM(v.quantidade_utilizada) as quantidade_utilizada_geral,
          SUM(v.quantidade_estornada) as quantidade_estornada_geral,
          SUM(v.quantidade_disponivel_real) as quantidade_disponivel_geral,
          SUM(v.valor_total_disponivel) as valor_total_disponivel
        FROM view_saldo_contratos_itens v
        JOIN contratos c ON v.contrato_id = c.id
        JOIN fornecedores f ON c.fornecedor_id = f.id
        WHERE 1=1
      `;
      
      const statsResult = await db.query(statsQuery + (countParams.length > 0 ? 
        countQuery.substring(countQuery.indexOf('WHERE 1=1') + 9) : ''), countParams);
      
      res.json({
        success: true,
        data: result.rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        },
        estatisticas: {
          total_itens: parseInt(statsResult.rows[0].total_itens || 0),
          itens_disponiveis: parseInt(statsResult.rows[0].itens_disponiveis || 0),
          itens_baixo_estoque: parseInt(statsResult.rows[0].itens_baixo_estoque || 0),
          itens_esgotados: parseInt(statsResult.rows[0].itens_esgotados || 0),
          quantidade_total_geral: parseFloat(statsResult.rows[0].quantidade_total_geral || 0),
          quantidade_utilizada_geral: parseFloat(statsResult.rows[0].quantidade_utilizada_geral || 0),
          quantidade_estornada_geral: parseFloat(statsResult.rows[0].quantidade_estornada_geral || 0),
          quantidade_disponivel_geral: parseFloat(statsResult.rows[0].quantidade_disponivel_geral || 0),
          valor_total_disponivel: parseFloat(statsResult.rows[0].valor_total_disponivel || 0)
        }
      });
      
    } catch (error: any) {
      console.error('Erro ao listar saldos de contratos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Busca fornecedores para filtro
   * GET /api/saldos-contratos/fornecedores
   */
  async listarFornecedores(req: Request, res: Response): Promise<void> {
    try {
      const query = `
        SELECT DISTINCT 
          f.id,
          f.nome
        FROM fornecedores f
        JOIN contratos c ON f.id = c.fornecedor_id
        JOIN view_saldo_contratos_itens v ON c.id = v.contrato_id
        ORDER BY f.nome
      `;
      
      const result = await db.query(query);
      
      res.json({
        success: true,
        data: result.rows
      });
      
    } catch (error: any) {
      console.error('Erro ao listar fornecedores:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Registra consumo de um produto do contrato
   * POST /api/saldos-contratos/:id/consumir
   */
  async registrarConsumo(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { quantidade, observacao, usuario_id } = req.body;

      // Validações
      if (!quantidade || quantidade <= 0) {
        res.status(400).json({
          success: false,
          message: 'Quantidade deve ser maior que zero'
        });
        return;
      }

      if (!usuario_id) {
        res.status(400).json({
          success: false,
          message: 'ID do usuário é obrigatório'
        });
        return;
      }

      // Buscar informações do contrato produto
      const contratoProdutoResult = await db.query(`
        SELECT cp.*, c.fornecedor_id, c.numero as contrato_numero, p.nome as produto_nome
        FROM contrato_produtos cp
        JOIN contratos c ON cp.contrato_id = c.id
        JOIN produtos p ON cp.produto_id = p.id
        WHERE cp.id = $1 AND cp.ativo = true
      `, [id]);

      if (contratoProdutoResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Produto do contrato não encontrado'
        });
        return;
      }

      const contratoProduto = contratoProdutoResult.rows[0];

      // Iniciar transação
      const client = await db.pool.connect();
      
      try {
        await client.query('BEGIN');

        // Registrar movimentação de consumo
        const movimentacaoResult = await client.query(`
          INSERT INTO movimentacoes_consumo_contrato 
          (contrato_produto_id, quantidade, tipo_movimentacao, observacao, usuario_id, created_at)
          VALUES ($1, $2, 'CONSUMO', $3, $4, CURRENT_TIMESTAMP)
          RETURNING id
        `, [id, quantidade, observacao || `Consumo de ${quantidade} ${contratoProduto.produto_nome}`, usuario_id]);

        // Atualizar quantidade consumida (mas não o saldo, pois agora é calculado dinamicamente)
        await client.query(`
          UPDATE contrato_produtos 
          SET 
            quantidade_consumida = COALESCE(quantidade_consumida, 0) + $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [quantidade, id]);

        // Atualizar saldo geral do contrato
        await client.query(`
          UPDATE contratos 
          SET saldo_disponivel = COALESCE(saldo_disponivel, 0) - ($1::numeric * $2::numeric),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `, [quantidade, contratoProduto.preco_unitario, contratoProduto.contrato_id]);

        await client.query('COMMIT');

        res.json({
          success: true,
          message: 'Consumo registrado com sucesso',
          data: {
            movimentacao_id: movimentacaoResult.rows[0].id,
            contrato_numero: contratoProduto.contrato_numero,
            produto_nome: contratoProduto.produto_nome,
            quantidade_consumida: quantidade,
            saldo_anterior: contratoProduto.saldo,
            saldo_atual: contratoProduto.saldo - quantidade
          }
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error: any) {
      console.error('Erro ao registrar consumo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Busca histórico de consumos de um produto do contrato
   * GET /api/saldos-contratos/:id/historico-consumo
   */
  async buscarHistoricoConsumo(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Buscar histórico de movimentações de consumo
      const query = `
        SELECT 
          mcc.id,
          mcc.quantidade,
          mcc.observacao,
          mcc.created_at as data_consumo,
          u.nome as responsavel_nome
        FROM movimentacoes_consumo_contrato mcc
        JOIN usuarios u ON mcc.usuario_id = u.id
        WHERE mcc.contrato_produto_id = $1
        AND mcc.tipo_movimentacao = 'CONSUMO'
        ORDER BY mcc.created_at DESC
      `;
      
      const result = await db.query(query, [id]);
      
      res.json({
        success: true,
        data: result.rows
      });
      
    } catch (error: any) {
      console.error('Erro ao buscar histórico de consumo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Deleta um consumo registrado
   * DELETE /api/saldos-contratos/consumo/:id
   */
  async deletarConsumo(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const usuarioId = req.body.usuario_id;

      if (!usuarioId) {
        res.status(400).json({
          success: false,
          message: 'ID do usuário é obrigatório'
        });
        return;
      }

      // Buscar informações do consumo
      const consumoResult = await db.query(`
        SELECT mcc.*, cp.contrato_id, cp.produto_id, p.nome as produto_nome, cp.preco_unitario
        FROM movimentacoes_consumo_contrato mcc
        JOIN contrato_produtos cp ON mcc.contrato_produto_id = cp.id
        JOIN produtos p ON cp.produto_id = p.id
        WHERE mcc.id = $1 AND mcc.tipo_movimentacao = 'CONSUMO'
      `, [id]);

      if (consumoResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Consumo não encontrado'
        });
        return;
      }

      const consumo = consumoResult.rows[0];

      // Iniciar transação
      const client = await db.pool.connect();
      
      try {
        await client.query('BEGIN');

        // Deletar o consumo
        await client.query(`
          DELETE FROM movimentacoes_consumo_contrato 
          WHERE id = $1
        `, [id]);

        // Atualizar quantidade consumida (mas não o saldo, pois agora é calculado dinamicamente)
        await client.query(`
          UPDATE contrato_produtos 
          SET 
            quantidade_consumida = COALESCE(quantidade_consumida, 0) - $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [consumo.quantidade, consumo.contrato_produto_id]);

        // Atualizar saldo geral do contrato (devolver o valor)
        await client.query(`
          UPDATE contratos 
          SET saldo_disponivel = COALESCE(saldo_disponivel, 0) + ($1::numeric * $2::numeric),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `, [consumo.quantidade, consumo.preco_unitario, consumo.contrato_id]);

        await client.query('COMMIT');

        res.json({
          success: true,
          message: 'Consumo deletado com sucesso',
          data: {
            consumo_id: id,
            quantidade_estornada: consumo.quantidade,
            produto_nome: consumo.produto_nome
          }
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error: any) {
      console.error('Erro ao deletar consumo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }
}

export const listarTodosSaldos = new SaldoContratosController().listarTodosSaldos;
export const listarFornecedores = new SaldoContratosController().listarFornecedores;
export const registrarConsumo = new SaldoContratosController().registrarConsumo;
export const buscarHistoricoConsumo = new SaldoContratosController().buscarHistoricoConsumo;
export const deletarConsumo = new SaldoContratosController().deletarConsumo;