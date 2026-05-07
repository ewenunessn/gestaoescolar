import { Request, Response } from 'express';
import db from "../../../database";
import {
  ensureContratoSaldoSchema,
  obterAvisosTrocaModoSaldo,
  obterConfiguracaoSaldoContrato,
  salvarConfiguracaoSaldoContrato,
} from "../services/contratoSaldoService";

/**
 * Controller para gerenciar saldos de contratos por modalidade
 */
class SaldoContratosModalidadesController {
  async obterConfiguracao(req: Request, res: Response): Promise<void> {
    try {
      const config = await obterConfiguracaoSaldoContrato();
      const avisos = await obterAvisosTrocaModoSaldo();
      res.json({ success: true, data: config, avisos });
    } catch (error) {
      console.error('Erro ao obter configuracao de saldo:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao obter configuracao de saldo',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async atualizarConfiguracao(req: Request, res: Response): Promise<void> {
    try {
      const { modulo_principal, mostrar_ambos = false } = req.body || {};
      if (modulo_principal !== 'modalidades' && modulo_principal !== 'contratos') {
        res.status(400).json({
          success: false,
          message: 'modulo_principal deve ser modalidades ou contratos'
        });
        return;
      }

      const avisos = await obterAvisosTrocaModoSaldo();
      const config = await salvarConfiguracaoSaldoContrato({ modulo_principal, mostrar_ambos: Boolean(mostrar_ambos) });
      res.json({ success: true, data: config, avisos });
    } catch (error) {
      console.error('Erro ao atualizar configuracao de saldo:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao atualizar configuracao de saldo',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async listarSaldosItens(req: Request, res: Response): Promise<void> {
    try {
      await ensureContratoSaldoSchema();
      const {
        page = 1,
        limit = 500,
        status,
        contrato_numero,
        produto_nome,
        fornecedor_id
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      const params: any[] = [];
      let paramIndex = 1;

      let where = `
        WHERE cp.ativo = true
          AND c.ativo = true
      `;

      if (contrato_numero) {
        where += ` AND c.numero ILIKE $${paramIndex}`;
        params.push(`%${contrato_numero}%`);
        paramIndex++;
      }

      if (produto_nome) {
        where += ` AND p.nome ILIKE $${paramIndex}`;
        params.push(`%${produto_nome}%`);
        paramIndex++;
      }

      if (fornecedor_id) {
        where += ` AND f.id = $${paramIndex}`;
        params.push(parseInt(fornecedor_id as string));
        paramIndex++;
      }

      if (status === 'DISPONIVEL' || status === 'disponivel') {
        where += ` AND COALESCE(cps.quantidade_disponivel, 0) > 0`;
      } else if (status === 'ESGOTADO' || status === 'esgotado') {
        where += ` AND COALESCE(cps.quantidade_disponivel, 0) = 0`;
      } else if (status === 'BAIXO_ESTOQUE' || status === 'baixo_estoque') {
        where += ` AND COALESCE(cps.quantidade_disponivel, 0) > 0 AND COALESCE(cps.quantidade_disponivel, 0) <= 10`;
      }

      const query = `
        SELECT
          cps.id,
          cp.id as contrato_produto_id,
          p.id as produto_id,
          p.nome as produto_nome,
          COALESCE(um.codigo, 'UN') as unidade,
          c.numero as contrato_numero,
          c.id as contrato_id,
          c.data_inicio,
          c.data_fim,
          c.status as contrato_status,
          f.nome as fornecedor_nome,
          f.id as fornecedor_id,
          cp.preco_unitario,
          cp.quantidade_contratada as quantidade_contrato,
          COALESCE(cps.quantidade_inicial, 0) as quantidade_inicial,
          COALESCE(cps.quantidade_consumida, 0) as quantidade_consumida,
          COALESCE(cps.quantidade_disponivel, 0) as quantidade_disponivel,
          COALESCE(cps.ativo, false) as ativo,
          (COALESCE(cps.quantidade_disponivel, 0) * cp.preco_unitario) as valor_disponivel,
          CASE
            WHEN COALESCE(cps.quantidade_disponivel, 0) <= 0 THEN 'ESGOTADO'
            WHEN COALESCE(cps.quantidade_disponivel, 0) <= 10 THEN 'BAIXO_ESTOQUE'
            ELSE 'DISPONIVEL'
          END as status
        FROM contrato_produtos cp
        JOIN contratos c ON cp.contrato_id = c.id
        JOIN produtos p ON cp.produto_id = p.id
        LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
        JOIN fornecedores f ON c.fornecedor_id = f.id
        LEFT JOIN contrato_produtos_saldos cps ON cps.contrato_produto_id = cp.id
        ${where}
        ORDER BY p.nome, c.numero
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const result = await db.query(query, [...params, parseInt(limit as string), offset]);

      const countResult = await db.query(`
        SELECT COUNT(*)::int as total
        FROM contrato_produtos cp
        JOIN contratos c ON cp.contrato_id = c.id
        JOIN produtos p ON cp.produto_id = p.id
        JOIN fornecedores f ON c.fornecedor_id = f.id
        LEFT JOIN contrato_produtos_saldos cps ON cps.contrato_produto_id = cp.id
        ${where}
      `, params);

      const total = Number(countResult.rows[0]?.total || 0);
      const estatisticas = {
        total_itens: total,
        itens_disponiveis: result.rows.filter((r: any) => Number(r.quantidade_disponivel) > 0).length,
        itens_baixo_estoque: result.rows.filter((r: any) => Number(r.quantidade_disponivel) > 0 && Number(r.quantidade_disponivel) <= 10).length,
        itens_esgotados: result.rows.filter((r: any) => Number(r.quantidade_disponivel) === 0).length,
        quantidade_inicial_total: result.rows.reduce((sum: number, r: any) => sum + Number(r.quantidade_inicial || 0), 0),
        quantidade_consumida_total: result.rows.reduce((sum: number, r: any) => sum + Number(r.quantidade_consumida || 0), 0),
        quantidade_disponivel_total: result.rows.reduce((sum: number, r: any) => sum + Number(r.quantidade_disponivel || 0), 0),
        valor_total_disponivel: result.rows.reduce((sum: number, r: any) => sum + Number(r.valor_disponivel || 0), 0)
      };

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        },
        estatisticas
      });
    } catch (error) {
      console.error('Erro ao listar saldos por item:', error);
      res.status((error as any)?.statusCode || 500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async cadastrarSaldoItem(req: Request, res: Response): Promise<void> {
    try {
      await ensureContratoSaldoSchema();
      const { contrato_produto_id, quantidade_inicial } = req.body;
      const quantidade = Number(quantidade_inicial);

      if (!contrato_produto_id || Number.isNaN(quantidade) || quantidade < 0) {
        res.status(400).json({ success: false, message: 'Dados de saldo invalidos' });
        return;
      }

      const existingResult = await db.query(`
        SELECT id, quantidade_consumida
        FROM contrato_produtos_saldos
        WHERE contrato_produto_id = $1
      `, [contrato_produto_id]);

      if (existingResult.rows.length > 0 && quantidade < Number(existingResult.rows[0].quantidade_consumida || 0)) {
        res.status(400).json({
          success: false,
          message: 'Quantidade inicial nao pode ser menor que a quantidade consumida'
        });
        return;
      }

      const result = await db.query(`
        INSERT INTO contrato_produtos_saldos (contrato_produto_id, quantidade_inicial, quantidade_consumida, ativo, created_at)
        VALUES ($1, $2, 0, true, CURRENT_TIMESTAMP)
        ON CONFLICT (contrato_produto_id) DO UPDATE
          SET quantidade_inicial = EXCLUDED.quantidade_inicial,
              ativo = true,
              updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [contrato_produto_id, quantidade]);

      res.json({ success: true, message: 'Saldo por item salvo com sucesso', data: result.rows[0] });
    } catch (error) {
      console.error('Erro ao salvar saldo por item:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao salvar saldo por item',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Lista todos os produtos de contratos com todas as modalidades
   * Mesmo que não tenham saldos cadastrados
   * GET /api/saldo-contratos-modalidades
   */
  async listarSaldosModalidades(req: Request, res: Response): Promise<void> {
    try {
      await ensureContratoSaldoSchema();
      const {
        page = 1,
        limit = 500,
        status,
        contrato_numero,
        produto_nome,
        fornecedor_id,
        modalidade_id
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Primeiro, buscar os produtos paginados (produtos únicos por nome)
      let produtosQuery = `
        SELECT DISTINCT p.nome as produto_nome, 
               array_agg(DISTINCT cp.id) as contrato_produto_ids
        FROM contrato_produtos cp
        JOIN contratos c ON cp.contrato_id = c.id
        JOIN produtos p ON cp.produto_id = p.id
        JOIN fornecedores f ON c.fornecedor_id = f.id
        WHERE cp.ativo = true
          AND c.ativo = true
      `;

      const produtosParams: any[] = [];
      let produtosParamIndex = 1;

      if (contrato_numero) {
        produtosQuery += ` AND c.numero ILIKE $${produtosParamIndex}`;
        produtosParams.push(`%${contrato_numero}%`);
        produtosParamIndex++;
      }

      if (produto_nome) {
        produtosQuery += ` AND p.nome ILIKE $${produtosParamIndex}`;
        produtosParams.push(`%${produto_nome}%`);
        produtosParamIndex++;
      }

      if (fornecedor_id) {
        produtosQuery += ` AND f.id = $${produtosParamIndex}`;
        produtosParams.push(parseInt(fornecedor_id as string));
        produtosParamIndex++;
      }

      produtosQuery += ` GROUP BY p.nome`;
      produtosQuery += ` ORDER BY p.nome`;
      produtosQuery += ` LIMIT $${produtosParamIndex} OFFSET $${produtosParamIndex + 1}`;
      produtosParams.push(parseInt(limit as string), offset);

      const produtosPaginados = await db.query(produtosQuery, produtosParams);
      const produtoIds = produtosPaginados.rows.flatMap((r: any) => r.contrato_produto_ids);


      // Se não há produtos, retornar vazio
      if (produtoIds.length === 0) {
        res.json({
          success: true,
          data: [],
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: 0,
            totalPages: 0
          },
          estatisticas: {
            total_itens: 0,
            itens_disponiveis: 0,
            itens_baixo_estoque: 0,
            itens_esgotados: 0,
            quantidade_inicial_total: 0,
            quantidade_consumida_total: 0,
            quantidade_disponivel_total: 0,
            valor_total_disponivel: 0
          }
        });
        return;
      }

      // Agora buscar todas as modalidades para esses produtos
      let query = `
        SELECT
          cp.id as contrato_produto_id,
          p.nome as produto_nome,
          COALESCE(um.codigo, 'UN') as unidade,
          c.numero as contrato_numero,
          c.id as contrato_id,
          f.nome as fornecedor_nome,
          f.id as fornecedor_id,
          cp.preco_unitario,
          cp.quantidade_contratada as quantidade_contrato,
          m.id as modalidade_id,
          m.nome as modalidade_nome,
          m.descricao as modalidade_descricao,
          m.categoria_financeira_id,
          cfm.nome as categoria_financeira_nome,
          COALESCE(cfm.codigo_financeiro, m.codigo_financeiro) as modalidade_codigo_financeiro,
          COALESCE(cfm.valor_repasse, m.valor_repasse) as modalidade_valor_repasse,
          COALESCE(cfm.parcelas, m.parcelas) as modalidade_parcelas,
          COALESCE(cpm.quantidade_inicial, 0) as quantidade_inicial,
          COALESCE(cpm.quantidade_consumida, 0) as quantidade_consumida,
          COALESCE(cpm.quantidade_disponivel, 0) as quantidade_disponivel,
          COALESCE(cpm.ativo, false) as modalidade_ativa,
          cpm.id as saldo_id,
          (COALESCE(cpm.quantidade_disponivel, 0) * cp.preco_unitario) as valor_disponivel
        FROM contrato_produtos cp
        JOIN contratos c ON cp.contrato_id = c.id
        JOIN produtos p ON cp.produto_id = p.id
        LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
        JOIN fornecedores f ON c.fornecedor_id = f.id
        CROSS JOIN modalidades m
        LEFT JOIN categorias_financeiras_modalidade cfm ON cfm.id = m.categoria_financeira_id
        LEFT JOIN contrato_produtos_modalidades cpm ON (
          cpm.contrato_produto_id = cp.id AND cpm.modalidade_id = m.id
        )
        WHERE cp.id = ANY($1)
          AND cp.ativo = true
          AND c.ativo = true
          AND m.ativo = true
      `;

      const queryParams: any[] = [produtoIds];
      let paramIndex = 2;

      if (modalidade_id) {
        query += ` AND m.id = $${paramIndex}`;
        queryParams.push(parseInt(modalidade_id as string));
        paramIndex++;
      }

      if (status) {
        if (status === 'disponivel') {
          query += ` AND COALESCE(cpm.quantidade_disponivel, 0) > 0`;
        } else if (status === 'esgotado') {
          query += ` AND COALESCE(cpm.quantidade_disponivel, 0) = 0`;
        } else if (status === 'baixo_estoque') {
          query += ` AND COALESCE(cpm.quantidade_disponivel, 0) > 0 AND COALESCE(cpm.quantidade_disponivel, 0) <= 10`;
        }
      }

      query += ` ORDER BY p.nome, m.nome`;

      const result = await db.query(query, queryParams);

      // Contar total de produtos únicos para paginação
      let countQuery = `
        SELECT COUNT(DISTINCT p.nome) as total
        FROM contrato_produtos cp
        JOIN contratos c ON cp.contrato_id = c.id
        JOIN produtos p ON cp.produto_id = p.id
        JOIN fornecedores f ON c.fornecedor_id = f.id
        WHERE cp.ativo = true
          AND c.ativo = true
      `;

      const countParams: any[] = [];
      let countParamIndex = 1;

      if (contrato_numero) {
        countQuery += ` AND c.numero ILIKE $${countParamIndex}`;
        countParams.push(`%${contrato_numero}%`);
        countParamIndex++;
      }

      if (produto_nome) {
        countQuery += ` AND p.nome ILIKE $${countParamIndex}`;
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

      // Calcular estatísticas
      const estatisticas = {
        total_itens: result.rows.length,
        itens_disponiveis: result.rows.filter((r: any) => r.quantidade_disponivel > 0).length,
        itens_baixo_estoque: result.rows.filter((r: any) => r.quantidade_disponivel > 0 && r.quantidade_disponivel <= 10).length,
        itens_esgotados: result.rows.filter((r: any) => r.quantidade_disponivel === 0).length,
        quantidade_inicial_total: result.rows.reduce((sum: number, r: any) => sum + parseFloat(r.quantidade_inicial || 0), 0),
        quantidade_consumida_total: result.rows.reduce((sum: number, r: any) => sum + parseFloat(r.quantidade_consumida || 0), 0),
        quantidade_disponivel_total: result.rows.reduce((sum: number, r: any) => sum + parseFloat(r.quantidade_disponivel || 0), 0),
        valor_total_disponivel: result.rows.reduce((sum: number, r: any) => sum + parseFloat(r.valor_disponivel || 0), 0)
      };

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        },
        estatisticas
      });

    } catch (error) {
      console.error('❌ Erro ao listar saldos de modalidades:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Cadastra ou atualiza saldo por modalidade
   * POST /api/saldo-contratos-modalidades
   */
  async cadastrarSaldoModalidade(req: Request, res: Response): Promise<void> {
    try {
      const { contrato_produto_id, modalidade_id, quantidade_inicial } = req.body;

      // Verificar se já existe um registro
      await ensureContratoSaldoSchema();
      const existingResult = await db.query(`
        SELECT id, quantidade_consumida
        FROM contrato_produtos_modalidades
        WHERE contrato_produto_id = $1 AND modalidade_id = $2
      `, [contrato_produto_id, modalidade_id]);

      if (existingResult.rows.length > 0 && Number(quantidade_inicial) < Number(existingResult.rows[0].quantidade_consumida || 0)) {
        res.status(400).json({
          success: false,
          message: 'Quantidade inicial nao pode ser menor que a quantidade consumida'
        });
        return;
      }

      if (existingResult.rows.length > 0) {
        // Atualizar registro existente
        const updateResult = await db.query(`
          UPDATE contrato_produtos_modalidades 
          SET quantidade_inicial = $1,
              quantidade_disponivel = $1 - quantidade_consumida,
              ativo = true,
              updated_at = CURRENT_TIMESTAMP
          WHERE contrato_produto_id = $2 AND modalidade_id = $3
          RETURNING *
        `, [quantidade_inicial, contrato_produto_id, modalidade_id]);

        res.json({
          success: true,
          message: 'Saldo atualizado com sucesso',
          data: updateResult.rows[0]
        });
      } else {
        // Criar novo registro
        const insertResult = await db.query(`
          INSERT INTO contrato_produtos_modalidades 
          (contrato_produto_id, modalidade_id, quantidade_inicial, quantidade_consumida, quantidade_disponivel, ativo, created_at)
          VALUES ($1, $2, $3, 0, $3, true, CURRENT_TIMESTAMP)
          RETURNING *
        `, [contrato_produto_id, modalidade_id, quantidade_inicial]);

        res.json({
          success: true,
          message: 'Saldo cadastrado com sucesso',
          data: insertResult.rows[0]
        });
      }

    } catch (error) {
      console.error('❌ Erro ao cadastrar saldo por modalidade:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Lista modalidades disponíveis
   * GET /api/saldo-contratos-modalidades/modalidades
   */
  async listarModalidades(req: Request, res: Response): Promise<void> {
    try {
      const result = await db.query(`
        SELECT
          m.id,
          m.nome,
          m.descricao,
          m.categoria_financeira_id,
          cfm.nome as categoria_financeira_nome,
          COALESCE(cfm.codigo_financeiro, m.codigo_financeiro) as codigo_financeiro,
          COALESCE(cfm.valor_repasse, m.valor_repasse) as valor_repasse,
          COALESCE(cfm.parcelas, m.parcelas) as parcelas,
          m.ativo
        FROM modalidades m
        LEFT JOIN categorias_financeiras_modalidade cfm ON cfm.id = m.categoria_financeira_id
        WHERE m.ativo = true
        ORDER BY m.nome
      `);

      res.json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      console.error('❌ Erro ao listar modalidades:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Lista produtos de contratos disponíveis
   * GET /api/saldo-contratos-modalidades/produtos-contratos
   */
  async listarProdutosContratos(req: Request, res: Response): Promise<void> {
    try {
      const result = await db.query(`
        SELECT
          cp.id,
          cp.contrato_id,
          cp.produto_id,
          cp.preco_unitario,
          cp.quantidade_contratada,
          c.numero as contrato_numero,
          c.data_inicio,
          c.data_fim,
          p.nome as produto_nome,
          COALESCE(um.codigo, 'UN') as unidade,
          f.nome as fornecedor_nome
        FROM contrato_produtos cp
        JOIN contratos c ON cp.contrato_id = c.id
        JOIN produtos p ON cp.produto_id = p.id
        LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
        JOIN fornecedores f ON c.fornecedor_id = f.id
        WHERE cp.ativo = true AND c.ativo = true
        ORDER BY c.numero, p.nome
      `);

      res.json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      console.error('❌ Erro ao listar produtos de contratos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Lista resumo de alunos por modalidade
   * GET /api/saldo-contratos-modalidades/resumo-alunos
   */
  async listarResumoAlunos(req: Request, res: Response): Promise<void> {
    try {
      const result = await db.query(`
        SELECT 
          m.id as modalidade_id,
          m.nome as modalidade_nome,
          m.categoria_financeira_id,
          cfm.nome as categoria_financeira_nome,
          COALESCE(cfm.codigo_financeiro, m.codigo_financeiro) as codigo_financeiro,
          COALESCE(SUM(em.quantidade_alunos), 0) as total_alunos,
          COUNT(em.id) as total_escolas,
          m.ativo
        FROM modalidades m
        LEFT JOIN categorias_financeiras_modalidade cfm ON cfm.id = m.categoria_financeira_id
        LEFT JOIN escola_modalidades em ON m.id = em.modalidade_id
        LEFT JOIN escolas e ON em.escola_id = e.id
        WHERE m.ativo = true AND (e.ativo = true OR e.id IS NULL)
        GROUP BY m.id, m.nome, m.categoria_financeira_id, cfm.nome, cfm.codigo_financeiro, m.codigo_financeiro, m.ativo
        ORDER BY m.nome
      `);

      res.json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      console.error('❌ Erro ao listar resumo de alunos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Lista resumo de alunos consolidado pela categoria financeira.
   * GET /api/saldo-contratos-modalidades/resumo-alunos-financeiro
   */
  async listarResumoAlunosFinanceiro(req: Request, res: Response): Promise<void> {
    try {
      const result = await db.query(`
        SELECT
          COALESCE(cfm.id, m.id) as categoria_financeira_id,
          COALESCE(cfm.nome, m.nome) as categoria_financeira_nome,
          COALESCE(cfm.codigo_financeiro, m.codigo_financeiro) as codigo_financeiro,
          COALESCE(cfm.valor_repasse, m.valor_repasse) as valor_repasse,
          COALESCE(cfm.parcelas, m.parcelas) as parcelas,
          COALESCE(SUM(em.quantidade_alunos), 0) as total_alunos,
          COUNT(DISTINCT em.escola_id) as total_escolas,
          ARRAY_AGG(DISTINCT m.nome ORDER BY m.nome) as modalidades_pedagogicas
        FROM modalidades m
        LEFT JOIN categorias_financeiras_modalidade cfm ON cfm.id = m.categoria_financeira_id
        LEFT JOIN escola_modalidades em ON m.id = em.modalidade_id
        LEFT JOIN escolas e ON em.escola_id = e.id
        WHERE m.ativo = true AND (e.ativo = true OR e.id IS NULL)
        GROUP BY
          COALESCE(cfm.id, m.id),
          COALESCE(cfm.nome, m.nome),
          COALESCE(cfm.codigo_financeiro, m.codigo_financeiro),
          COALESCE(cfm.valor_repasse, m.valor_repasse),
          COALESCE(cfm.parcelas, m.parcelas)
        ORDER BY categoria_financeira_nome
      `);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Erro ao listar resumo financeiro de alunos:', error);
      res.status((error as any)?.statusCode || 500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Registra consumo de uma modalidade
   * POST /api/saldo-contratos-modalidades/:id/consumir
   */
  async registrarConsumoModalidade(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { quantidade, observacao, data_consumo, usuario_id } = req.body;
      const quantidadeNumerica = Number(quantidade);

      if (!quantidadeNumerica || quantidadeNumerica <= 0) {
        res.status(400).json({
          success: false,
          message: 'Quantidade invalida'
        });
        return;
      }

      await ensureContratoSaldoSchema();
      const consumoResult = await db.transaction(async (client) => {
        const saldoResult = await client.query(`
          SELECT
            id,
            contrato_produto_id,
            modalidade_id,
            quantidade_inicial,
            quantidade_consumida,
            quantidade_disponivel
          FROM contrato_produtos_modalidades
          WHERE id = $1
          FOR UPDATE
        `, [id]);

        if (saldoResult.rows.length === 0) {
          const notFound = new Error('Saldo de modalidade nao encontrado');
          (notFound as any).statusCode = 404;
          throw notFound;
        }

        const saldo = saldoResult.rows[0];
        if (Number(saldo.quantidade_disponivel) < quantidadeNumerica) {
          const insufficient = new Error(`Quantidade insuficiente. Disponivel: ${saldo.quantidade_disponivel}`);
          (insufficient as any).statusCode = 400;
          throw insufficient;
        }

        const saldoAtualizadoResult = await client.query(`
          UPDATE contrato_produtos_modalidades
          SET quantidade_consumida = quantidade_consumida + $1,
              quantidade_disponivel = quantidade_inicial - (quantidade_consumida + $1),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING quantidade_consumida, quantidade_disponivel
        `, [quantidadeNumerica, id]);

        await client.query(`
          INSERT INTO contrato_produtos_modalidades_historico
          (contrato_produto_modalidade_id, quantidade, data_consumo, observacao, usuario_id)
          VALUES ($1, $2, $3, $4, $5)
        `, [id, quantidadeNumerica, data_consumo || new Date().toISOString().split('T')[0], observacao, usuario_id]);

        return {
          saldo,
          saldoAtualizado: saldoAtualizadoResult.rows[0]
        };
      });

      res.json({
        success: true,
        message: 'Consumo registrado com sucesso',
        data: {
          id: consumoResult.saldo.id,
          quantidade_consumida: consumoResult.saldoAtualizado.quantidade_consumida,
          quantidade_disponivel: consumoResult.saldoAtualizado.quantidade_disponivel
        }
      });
    } catch (error) {
      console.error('Erro ao registrar consumo:', error);
      res.status((error as any)?.statusCode || 500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Busca histórico de consumos de uma modalidade
   * GET /api/saldo-contratos-modalidades/:id/historico
   */
  async buscarHistoricoConsumoModalidade(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Buscar informações da modalidade
      const saldoResult = await db.query(`
        SELECT
          cpm.id,
          cpm.contrato_produto_id,
          cpm.modalidade_id,
          p.nome as produto_nome,
          COALESCE(um.codigo, 'UN') as unidade,
          m.nome as modalidade_nome,
          c.numero as contrato_numero
        FROM contrato_produtos_modalidades cpm
        JOIN contrato_produtos cp ON cpm.contrato_produto_id = cp.id
        JOIN produtos p ON cp.produto_id = p.id
        LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
        JOIN contratos c ON cp.contrato_id = c.id
        JOIN modalidades m ON cpm.modalidade_id = m.id
        WHERE cpm.id = $1
      `, [id]);

      if (saldoResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Saldo de modalidade não encontrado'
        });
        return;
      }

      // Buscar histórico de consumos
      const historicoResult = await db.query(`
        SELECT 
          id,
          quantidade,
          data_consumo,
          observacao,
          usuario_id,
          created_at
        FROM contrato_produtos_modalidades_historico
        WHERE contrato_produto_modalidade_id = $1
        ORDER BY data_consumo DESC, created_at DESC
      `, [id]);

      res.json({
        success: true,
        data: {
          modalidade: saldoResult.rows[0],
          historico: historicoResult.rows
        }
      });

    } catch (error) {
      console.error('❌ Erro ao buscar histórico:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Exclui um registro de consumo do histórico
   * DELETE /api/saldo-contratos-modalidades/:id/consumo/:consumoId
   */
  async excluirConsumoModalidade(req: Request, res: Response): Promise<void> {
    try {
      await ensureContratoSaldoSchema();
      const { id, consumoId } = req.params;

      await db.transaction(async (client) => {
        const consumoResult = await client.query(`
          SELECT
            id,
            contrato_produto_modalidade_id,
            quantidade
          FROM contrato_produtos_modalidades_historico
          WHERE id = $1 AND contrato_produto_modalidade_id = $2
          FOR UPDATE
        `, [consumoId, id]);

        if (consumoResult.rows.length === 0) {
          const notFound = new Error('Registro de consumo nao encontrado');
          (notFound as any).statusCode = 404;
          throw notFound;
        }

        const consumo = consumoResult.rows[0];

        await client.query(`
          UPDATE contrato_produtos_modalidades
          SET quantidade_consumida = GREATEST(quantidade_consumida - $1, 0),
              quantidade_disponivel = quantidade_inicial - GREATEST(quantidade_consumida - $1, 0),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [consumo.quantidade, id]);

        await client.query(`
          DELETE FROM contrato_produtos_modalidades_historico
          WHERE id = $1
        `, [consumoId]);
      });

      res.json({
        success: true,
        message: 'Consumo excluido com sucesso'
      });
    } catch (error) {
      console.error('Erro ao excluir consumo:', error);
      res.status((error as any)?.statusCode || 500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

}

export const saldoContratosModalidadesController = new SaldoContratosModalidadesController();

// Exportar métodos individuais para compatibilidade com rotas
export const obterConfiguracao = saldoContratosModalidadesController.obterConfiguracao.bind(saldoContratosModalidadesController);
export const atualizarConfiguracao = saldoContratosModalidadesController.atualizarConfiguracao.bind(saldoContratosModalidadesController);
export const listarSaldosItens = saldoContratosModalidadesController.listarSaldosItens.bind(saldoContratosModalidadesController);
export const cadastrarSaldoItem = saldoContratosModalidadesController.cadastrarSaldoItem.bind(saldoContratosModalidadesController);
export const listarSaldosModalidades = saldoContratosModalidadesController.listarSaldosModalidades.bind(saldoContratosModalidadesController);
export const cadastrarSaldoModalidade = saldoContratosModalidadesController.cadastrarSaldoModalidade.bind(saldoContratosModalidadesController);
export const listarModalidades = saldoContratosModalidadesController.listarModalidades.bind(saldoContratosModalidadesController);
export const listarProdutosContratos = saldoContratosModalidadesController.listarProdutosContratos.bind(saldoContratosModalidadesController);
export const listarResumoAlunos = saldoContratosModalidadesController.listarResumoAlunos.bind(saldoContratosModalidadesController);
export const listarResumoAlunosFinanceiro = saldoContratosModalidadesController.listarResumoAlunosFinanceiro.bind(saldoContratosModalidadesController);
export const registrarConsumoModalidade = saldoContratosModalidadesController.registrarConsumoModalidade.bind(saldoContratosModalidadesController);
export const buscarHistoricoConsumoModalidade = saldoContratosModalidadesController.buscarHistoricoConsumoModalidade.bind(saldoContratosModalidadesController);
export const excluirConsumoModalidade = saldoContratosModalidadesController.excluirConsumoModalidade.bind(saldoContratosModalidadesController);

export default saldoContratosModalidadesController;
