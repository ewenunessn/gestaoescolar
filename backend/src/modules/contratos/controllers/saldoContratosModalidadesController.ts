import { Request, Response } from 'express';
const db = require('../../../database');

/**
 * Controller para gerenciar saldos de contratos por modalidade
 */
class SaldoContratosModalidadesController {
  /**
   * Lista todos os saldos por modalidade
   * GET /api/saldo-contratos-modalidades
   */
  async listarSaldosModalidades(req: Request, res: Response): Promise<void> {
    try {
      const { 
        page = 1, 
        limit = 50, 
        status, 
        contrato_numero, 
        produto_nome,
        fornecedor_id,
        modalidade_id 
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      // Query base
      let query = `
        SELECT 
          v.*
        FROM view_saldo_contratos_modalidades v
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
        query += ` AND v.fornecedor_id = $${paramIndex}`;
        params.push(parseInt(fornecedor_id as string));
        paramIndex++;
      }

      if (modalidade_id) {
        query += ` AND v.modalidade_id = $${paramIndex}`;
        params.push(parseInt(modalidade_id as string));
        paramIndex++;
      }
      
      // Ordenação e paginação
      query += ` ORDER BY v.contrato_numero, v.produto_nome, v.modalidade_nome`;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit as string), offset);
      
      const result = await db.query(query, params);
      
      // Query para contar total de registros
      let countQuery = `
        SELECT COUNT(*) as total
        FROM view_saldo_contratos_modalidades v
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
        countQuery += ` AND v.fornecedor_id = $${countParamIndex}`;
        countParams.push(parseInt(fornecedor_id as string));
        countParamIndex++;
      }

      if (modalidade_id) {
        countQuery += ` AND v.modalidade_id = $${countParamIndex}`;
        countParams.push(parseInt(modalidade_id as string));
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
          SUM(v.quantidade_inicial) as quantidade_inicial_total,
          SUM(v.quantidade_consumida) as quantidade_consumida_total,
          SUM(v.quantidade_disponivel) as quantidade_disponivel_total,
          SUM(v.valor_disponivel) as valor_total_disponivel
        FROM view_saldo_contratos_modalidades v
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
          quantidade_inicial_total: parseFloat(statsResult.rows[0].quantidade_inicial_total || 0),
          quantidade_consumida_total: parseFloat(statsResult.rows[0].quantidade_consumida_total || 0),
          quantidade_disponivel_total: parseFloat(statsResult.rows[0].quantidade_disponivel_total || 0),
          valor_total_disponivel: parseFloat(statsResult.rows[0].valor_total_disponivel || 0)
        }
      });
      
    } catch (error: any) {
      console.error('Erro ao listar saldos por modalidade:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Lista modalidades disponíveis
   * GET /api/saldo-contratos-modalidades/modalidades
   */
  async listarModalidades(req: Request, res: Response): Promise<void> {
    try {
      const query = `
        SELECT 
          id,
          nome,
          codigo_financeiro,
          valor_repasse
        FROM modalidades
        WHERE ativo = true
        ORDER BY nome
      `;
      
      const result = await db.query(query);
      
      res.json({
        success: true,
        data: result.rows
      });
      
    } catch (error: any) {
      console.error('Erro ao listar modalidades:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Lista produtos de contratos disponíveis para cadastro de saldo
   * GET /api/saldo-contratos-modalidades/produtos-contratos
   */
  async listarProdutosContratos(req: Request, res: Response): Promise<void> {
    try {
      const query = `
        SELECT 
          cp.id,
          cp.contrato_id,
          cp.produto_id,
          cp.preco_unitario,
          c.numero as contrato_numero,
          c.data_inicio,
          c.data_fim,
          p.nome as produto_nome,
          p.unidade,
          f.nome as fornecedor_nome
        FROM contrato_produtos cp
        JOIN contratos c ON cp.contrato_id = c.id
        JOIN produtos p ON cp.produto_id = p.id
        JOIN fornecedores f ON c.fornecedor_id = f.id
        WHERE cp.ativo = true 
          AND c.ativo = true
          AND c.status = 'ativo'
        ORDER BY c.numero, p.nome
      `;
      
      const result = await db.query(query);
      
      res.json({
        success: true,
        data: result.rows
      });
      
    } catch (error: any) {
      console.error('Erro ao listar produtos de contratos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Cadastra ou atualiza saldo inicial por modalidade
   * POST /api/saldo-contratos-modalidades
   */
  async cadastrarSaldoModalidade(req: Request, res: Response): Promise<void> {
    try {
      const { contrato_produto_id, modalidade_id, quantidade_inicial } = req.body;

      // Validações
      if (!contrato_produto_id || !modalidade_id || quantidade_inicial === undefined) {
        res.status(400).json({
          success: false,
          message: 'Contrato produto, modalidade e quantidade inicial são obrigatórios'
        });
        return;
      }

      if (quantidade_inicial < 0) {
        res.status(400).json({
          success: false,
          message: 'Quantidade inicial não pode ser negativa'
        });
        return;
      }

      // Verificar se já existe registro
      const existeResult = await db.query(`
        SELECT id, quantidade_inicial, quantidade_consumida 
        FROM contrato_produtos_modalidades 
        WHERE contrato_produto_id = $1 AND modalidade_id = $2
      `, [contrato_produto_id, modalidade_id]);

      let result;
      
      if (existeResult.rows.length > 0) {
        // Atualizar registro existente
        result = await db.query(`
          UPDATE contrato_produtos_modalidades 
          SET quantidade_inicial = $1, updated_at = CURRENT_TIMESTAMP
          WHERE contrato_produto_id = $2 AND modalidade_id = $3
          RETURNING *
        `, [quantidade_inicial, contrato_produto_id, modalidade_id]);
      } else {
        // Criar novo registro
        result = await db.query(`
          INSERT INTO contrato_produtos_modalidades 
          (contrato_produto_id, modalidade_id, quantidade_inicial)
          VALUES ($1, $2, $3)
          RETURNING *
        `, [contrato_produto_id, modalidade_id, quantidade_inicial]);
      }

      res.json({
        success: true,
        message: existeResult.rows.length > 0 ? 'Saldo atualizado com sucesso' : 'Saldo cadastrado com sucesso',
        data: result.rows[0]
      });

    } catch (error: any) {
      console.error('Erro ao cadastrar saldo por modalidade:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Registra consumo por modalidade
   * POST /api/saldo-contratos-modalidades/:id/consumir
   */
  async registrarConsumoModalidade(req: Request, res: Response): Promise<void> {
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

      // Buscar informações do saldo por modalidade
      const saldoResult = await db.query(`
        SELECT * FROM view_saldo_contratos_modalidades
        WHERE id = $1
      `, [id]);

      if (saldoResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Saldo por modalidade não encontrado'
        });
        return;
      }

      const saldo = saldoResult.rows[0];

      // Verificar se há saldo suficiente
      if (quantidade > saldo.quantidade_disponivel) {
        res.status(400).json({
          success: false,
          message: `Saldo insuficiente. Disponível: ${saldo.quantidade_disponivel}`
        });
        return;
      }

      // Iniciar transação
      const client = await db.pool.connect();
      
      try {
        await client.query('BEGIN');

        // Registrar movimentação de consumo
        const movimentacaoResult = await client.query(`
          INSERT INTO movimentacoes_consumo_modalidade 
          (contrato_produto_modalidade_id, quantidade, tipo_movimentacao, observacao, usuario_id)
          VALUES ($1, $2, 'CONSUMO', $3, $4)
          RETURNING id
        `, [id, quantidade, observacao || `Consumo de ${quantidade} ${saldo.produto_nome} - ${saldo.modalidade_nome}`, usuario_id]);

        // Atualizar quantidade consumida
        await client.query(`
          UPDATE contrato_produtos_modalidades 
          SET quantidade_consumida = quantidade_consumida + $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [quantidade, id]);

        await client.query('COMMIT');

        res.json({
          success: true,
          message: 'Consumo registrado com sucesso',
          data: {
            movimentacao_id: movimentacaoResult.rows[0].id,
            contrato_numero: saldo.contrato_numero,
            produto_nome: saldo.produto_nome,
            modalidade_nome: saldo.modalidade_nome,
            quantidade_consumida: quantidade,
            saldo_anterior: saldo.quantidade_disponivel,
            saldo_atual: saldo.quantidade_disponivel - quantidade
          }
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error: any) {
      console.error('Erro ao registrar consumo por modalidade:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Busca histórico de consumos por modalidade
   * GET /api/saldo-contratos-modalidades/:id/historico
   */
  async buscarHistoricoConsumoModalidade(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const query = `
        SELECT 
          mcm.id,
          mcm.quantidade,
          mcm.tipo_movimentacao,
          mcm.observacao,
          mcm.created_at as data_consumo,
          u.nome as responsavel_nome
        FROM movimentacoes_consumo_modalidade mcm
        LEFT JOIN usuarios u ON mcm.usuario_id = u.id
        WHERE mcm.contrato_produto_modalidade_id = $1
        ORDER BY mcm.created_at DESC
      `;
      
      const result = await db.query(query, [id]);
      
      res.json({
        success: true,
        data: result.rows
      });
      
    } catch (error: any) {
      console.error('Erro ao buscar histórico de consumo por modalidade:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }
}

export const listarSaldosModalidades = new SaldoContratosModalidadesController().listarSaldosModalidades;
export const listarModalidades = new SaldoContratosModalidadesController().listarModalidades;
export const listarProdutosContratos = new SaldoContratosModalidadesController().listarProdutosContratos;
export const cadastrarSaldoModalidade = new SaldoContratosModalidadesController().cadastrarSaldoModalidade;
export const registrarConsumoModalidade = new SaldoContratosModalidadesController().registrarConsumoModalidade;
export const buscarHistoricoConsumoModalidade = new SaldoContratosModalidadesController().buscarHistoricoConsumoModalidade;