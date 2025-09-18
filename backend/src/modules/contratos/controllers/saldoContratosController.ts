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
          SUM(v.quantidade_reservada) as quantidade_reservada_geral,
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
          quantidade_reservada_geral: parseFloat(statsResult.rows[0].quantidade_reservada_geral || 0),
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
}

export const listarTodosSaldos = new SaldoContratosController().listarTodosSaldos;
export const listarFornecedores = new SaldoContratosController().listarFornecedores;