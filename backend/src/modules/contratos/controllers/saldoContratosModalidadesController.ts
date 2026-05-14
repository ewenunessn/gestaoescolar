import { Request, Response } from 'express';
import db from "../../../database";
import {
  ensureContratoSaldoSchema,
  obterAvisosTrocaModoSaldo,
  obterConfiguracaoSaldoContrato,
  registrarMovimentoContratoProduto,
  salvarConfiguracaoSaldoContrato,
} from "../services/contratoSaldoService";

export interface SaldoContratosCursorResponseInput<T> {
  items: T[];
  pageSize: number;
  offset: number;
  hasMore: boolean;
  estatisticas?: Record<string, unknown>;
}

function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ offset })).toString("base64url");
}

function decodeCursor(cursor: unknown): number {
  if (typeof cursor !== "string" || cursor.trim() === "") return 0;
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    const offset = Number(decoded?.offset);
    return Number.isFinite(offset) && offset >= 0 ? offset : 0;
  } catch {
    return 0;
  }
}

export function buildSaldoContratosCursorResponse<T>({
  items,
  pageSize,
  offset,
  hasMore,
  estatisticas,
}: SaldoContratosCursorResponseInput<T>) {
  const response: {
    page_size: number;
    next_cursor: string | null;
    has_more: boolean;
    items: T[];
    estatisticas?: Record<string, unknown>;
  } = {
    page_size: pageSize,
    next_cursor: hasMore ? encodeCursor(offset + pageSize) : null,
    has_more: hasMore,
    items,
  };

  if (estatisticas) response.estatisticas = estatisticas;
  return response;
}

function getPageSize(query: Request["query"], fallback = 500): number {
  return parseInt((query.page_size || query.limit || fallback) as string);
}

function getCursorOffset(query: Request["query"]): number {
  if (query.cursor) return decodeCursor(query.cursor);
  const page = parseInt((query.page || 1) as string);
  const pageSize = getPageSize(query);
  return Math.max(0, (page - 1) * pageSize);
}

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
      res.status((error as any)?.statusCode || 500).json({
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
      res.status((error as any)?.statusCode || 500).json({
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
        status,
        contrato_numero,
        produto_nome,
        fornecedor_id
      } = req.query;

      const pageSize = getPageSize(req.query);
      const offset = getCursorOffset(req.query);
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
        where += ` AND COALESCE(cps.saldo_atual, 0) > 0`;
      } else if (status === 'ESGOTADO' || status === 'esgotado') {
        where += ` AND COALESCE(cps.saldo_atual, 0) = 0`;
      } else if (status === 'BAIXO_ESTOQUE' || status === 'baixo_estoque') {
        where += ` AND COALESCE(cps.saldo_atual, 0) > 0 AND COALESCE(cps.saldo_atual, 0) <= 10`;
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
          COALESCE(cps.saldo_inicial, 0) as quantidade_inicial,
          COALESCE(cps.quantidade_consumida, 0) as quantidade_consumida,
          COALESCE(cps.saldo_atual, 0) as quantidade_disponivel,
          COALESCE(cps.ativo, false) as ativo,
          (COALESCE(cps.saldo_atual, 0) * cp.preco_unitario) as valor_disponivel,
          CASE
            WHEN COALESCE(cps.saldo_atual, 0) <= 0 THEN 'ESGOTADO'
            WHEN COALESCE(cps.saldo_atual, 0) <= 10 THEN 'BAIXO_ESTOQUE'
            ELSE 'DISPONIVEL'
          END as status
        FROM contrato_produtos cp
        JOIN contratos c ON cp.contrato_id = c.id
        JOIN produtos p ON cp.produto_id = p.id
        LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
        JOIN fornecedores f ON c.fornecedor_id = f.id
        LEFT JOIN contrato_produto_saldos cps ON cps.contrato_produto_id = cp.id AND cps.modalidade_financeira_id IS NULL
        ${where}
        ORDER BY p.nome, c.numero
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const result = await db.query(query, [...params, pageSize + 1, offset]);
      const items = result.rows.slice(0, pageSize);
      const hasMore = result.rows.length > pageSize;
      const estatisticas = {
        total_itens: items.length,
        itens_disponiveis: items.filter((r: any) => Number(r.quantidade_disponivel) > 0).length,
        itens_baixo_estoque: items.filter((r: any) => Number(r.quantidade_disponivel) > 0 && Number(r.quantidade_disponivel) <= 10).length,
        itens_esgotados: items.filter((r: any) => Number(r.quantidade_disponivel) === 0).length,
        quantidade_inicial_total: items.reduce((sum: number, r: any) => sum + Number(r.quantidade_inicial || 0), 0),
        quantidade_consumida_total: items.reduce((sum: number, r: any) => sum + Number(r.quantidade_consumida || 0), 0),
        quantidade_disponivel_total: items.reduce((sum: number, r: any) => sum + Number(r.quantidade_disponivel || 0), 0),
        valor_total_disponivel: items.reduce((sum: number, r: any) => sum + Number(r.valor_disponivel || 0), 0)
      };

      res.json(buildSaldoContratosCursorResponse({
        items,
        pageSize,
        offset,
        hasMore,
        estatisticas,
      }));
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

      const result = await db.transaction(async (client) => {
        await ensureContratoSaldoSchema(client);
        const existingResult = await client.query(`
          SELECT id, quantidade_consumida, saldo_atual
          FROM contrato_produto_saldos
          WHERE contrato_produto_id = $1
            AND modalidade_financeira_id IS NULL
          FOR UPDATE
        `, [contrato_produto_id]);

        if (existingResult.rows.length > 0) {
          if (quantidade < Number(existingResult.rows[0].quantidade_consumida || 0)) {
            const error = new Error('Quantidade inicial nao pode ser menor que a quantidade consumida');
            (error as any).statusCode = 400;
            throw error;
          }

          const saldoDepois = quantidade - Number(existingResult.rows[0].quantidade_consumida || 0);
          const saldoAntes = Number(existingResult.rows[0].saldo_atual || 0);
          const quantidadeAjuste = Math.abs(saldoDepois - saldoAntes);

          if (quantidadeAjuste > 0) {
            await registrarMovimentoContratoProduto(client, {
              contratoProdutoId: Number(contrato_produto_id),
              modalidadeFinanceiraId: null,
              tipoMovimento: "AJUSTE",
              quantidade: quantidadeAjuste,
              saldoDepois,
              descricao: "Ajuste de saldo inicial por item",
              origemTipo: "saldo_contrato_item",
              origemId: Number(existingResult.rows[0].id),
              criadoPor: req.user?.id ?? null,
            });
          }

          await client.query(`
            UPDATE contrato_produto_saldos
            SET saldo_inicial = $1,
                ativo = true,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `, [quantidade, existingResult.rows[0].id]);
        } else {
          const insertResult = await client.query(`
            INSERT INTO contrato_produto_saldos (
              contrato_produto_id,
              modalidade_financeira_id,
              saldo_inicial,
              saldo_atual,
              quantidade_consumida,
              ativo,
              created_at,
              updated_at
            )
            VALUES ($1, NULL, 0, 0, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *
          `, [contrato_produto_id]);

          if (quantidade > 0) {
            await registrarMovimentoContratoProduto(client, {
              contratoProdutoId: Number(contrato_produto_id),
              modalidadeFinanceiraId: null,
              tipoMovimento: "ENTRADA_CONTRATO",
              quantidade,
              descricao: "Entrada inicial do produto contratado",
              origemTipo: "saldo_contrato_item",
              origemId: Number(insertResult.rows[0].id),
              criadoPor: req.user?.id ?? null,
            });
          }

          await client.query(`
            UPDATE contrato_produto_saldos
            SET saldo_inicial = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `, [quantidade, insertResult.rows[0].id]);
        }

        const saldoResult = await client.query(`
          SELECT
            id,
            contrato_produto_id,
            saldo_inicial as quantidade_inicial,
            quantidade_consumida,
            saldo_atual as quantidade_disponivel,
            ativo,
            created_at,
            updated_at
          FROM contrato_produto_saldos
          WHERE contrato_produto_id = $1
            AND modalidade_financeira_id IS NULL
        `, [contrato_produto_id]);
        return saldoResult.rows[0];
      });

      res.json({ success: true, message: 'Saldo por item salvo com sucesso', data: result });
    } catch (error) {
      console.error('Erro ao salvar saldo por item:', error);
      res.status((error as any)?.statusCode || 500).json({
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
        status,
        contrato_numero,
        produto_nome,
        fornecedor_id,
        modalidade_id
      } = req.query;

      const pageSize = getPageSize(req.query);
      const offset = getCursorOffset(req.query);

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
      produtosParams.push(pageSize + 1, offset);

      const produtosPaginados = await db.query(produtosQuery, produtosParams);
      const produtosPagina = produtosPaginados.rows.slice(0, pageSize);
      const hasMore = produtosPaginados.rows.length > pageSize;
      const produtoIds = produtosPagina.flatMap((r: any) => r.contrato_produto_ids);


      // Se não há produtos, retornar vazio
      if (produtoIds.length === 0) {
        res.json(buildSaldoContratosCursorResponse({
          items: [],
          pageSize,
          offset,
          hasMore,
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
        }));
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
          categorias_financeiras.ids[1] as categoria_financeira_id,
          categorias_financeiras.nomes as categoria_financeira_nome,
          categorias_financeiras.codigos as modalidade_codigo_financeiro,
          COALESCE(categorias_financeiras.valor_repasse, 0) as modalidade_valor_repasse,
          COALESCE(categorias_financeiras.parcelas, 1) as modalidade_parcelas,
          COALESCE(cpm.saldo_inicial, 0) as quantidade_inicial,
          COALESCE(cpm.quantidade_consumida, 0) as quantidade_consumida,
          COALESCE(cpm.saldo_atual, 0) as quantidade_disponivel,
          COALESCE(cpm.ativo, false) as modalidade_ativa,
          cpm.id as saldo_id,
          (COALESCE(cpm.saldo_atual, 0) * cp.preco_unitario) as valor_disponivel
        FROM contrato_produtos cp
        JOIN contratos c ON cp.contrato_id = c.id
        JOIN produtos p ON cp.produto_id = p.id
        LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
        JOIN fornecedores f ON c.fornecedor_id = f.id
        CROSS JOIN modalidades m
        LEFT JOIN LATERAL (
          SELECT
            ARRAY_AGG(cfmv.id ORDER BY cfmv.nome) as ids,
            STRING_AGG(cfmv.nome, ', ' ORDER BY cfmv.nome) as nomes,
            STRING_AGG(cfmv.codigo_financeiro, ', ' ORDER BY cfmv.nome) FILTER (WHERE cfmv.codigo_financeiro IS NOT NULL) as codigos,
            SUM(COALESCE(cfmv.valor_repasse, 0)) as valor_repasse,
            MAX(COALESCE(cfmv.parcelas, 1)) as parcelas
          FROM modalidade_categorias_financeiras mcf
          JOIN categorias_financeiras_modalidade cfmv ON cfmv.id = mcf.categoria_financeira_id
          WHERE mcf.modalidade_id = m.id
            AND mcf.ativo = true
            AND cfmv.ativo = true
        ) categorias_financeiras ON true
        LEFT JOIN contrato_produto_saldos cpm ON (
          cpm.contrato_produto_id = cp.id AND cpm.modalidade_financeira_id = m.id
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
        const statusFiltro = String(status).toLowerCase();
        if (statusFiltro === 'disponivel') {
          query += ` AND COALESCE(cpm.saldo_atual, 0) > 0`;
        } else if (statusFiltro === 'esgotado') {
          query += ` AND COALESCE(cpm.saldo_atual, 0) = 0`;
        } else if (statusFiltro === 'baixo_estoque') {
          query += ` AND COALESCE(cpm.saldo_atual, 0) > 0 AND COALESCE(cpm.saldo_atual, 0) <= 10`;
        }
      }

      query += ` ORDER BY p.nome, m.nome`;

      const result = await db.query(query, queryParams);

      // Contar total de produtos únicos para paginação
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

      res.json(buildSaldoContratosCursorResponse({
        items: result.rows,
        pageSize,
        offset,
        hasMore,
        estatisticas,
      }));

    } catch (error) {
      console.error('❌ Erro ao listar saldos de modalidades:', error);
      res.status((error as any)?.statusCode || 500).json({
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
      const quantidade = Number(quantidade_inicial);

      if (!contrato_produto_id || !modalidade_id || Number.isNaN(quantidade) || quantidade < 0) {
        res.status(400).json({ success: false, message: 'Dados de saldo invalidos' });
        return;
      }

      // Verificar se já existe um registro
      const result = await db.transaction(async (client) => {
        await ensureContratoSaldoSchema(client);
        const existingResult = await client.query(`
          SELECT id, quantidade_consumida, saldo_atual
          FROM contrato_produto_saldos
          WHERE contrato_produto_id = $1 AND modalidade_financeira_id = $2
          FOR UPDATE
        `, [contrato_produto_id, modalidade_id]);

        if (existingResult.rows.length > 0 && quantidade < Number(existingResult.rows[0].quantidade_consumida || 0)) {
          const error = new Error('Quantidade inicial nao pode ser menor que a quantidade consumida');
          (error as any).statusCode = 400;
          throw error;
        }

        if (existingResult.rows.length > 0) {
          const saldoDepois = quantidade - Number(existingResult.rows[0].quantidade_consumida || 0);
          const saldoAntes = Number(existingResult.rows[0].saldo_atual || 0);
          const quantidadeAjuste = Math.abs(saldoDepois - saldoAntes);

          if (quantidadeAjuste > 0) {
            await registrarMovimentoContratoProduto(client, {
              contratoProdutoId: Number(contrato_produto_id),
              modalidadeFinanceiraId: Number(modalidade_id),
              tipoMovimento: "AJUSTE",
              quantidade: quantidadeAjuste,
              saldoDepois,
              descricao: "Ajuste de saldo inicial por modalidade financeira",
              origemTipo: "saldo_contrato_modalidade",
              origemId: Number(existingResult.rows[0].id),
              criadoPor: req.user?.id ?? null,
            });
          }

          const updateResult = await client.query(`
            UPDATE contrato_produto_saldos
            SET saldo_inicial = $1,
                ativo = true,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id, contrato_produto_id, modalidade_financeira_id as modalidade_id,
              saldo_inicial as quantidade_inicial, quantidade_consumida,
              saldo_atual as quantidade_disponivel, ativo, created_at, updated_at
          `, [quantidade, existingResult.rows[0].id]);

          return { message: 'Saldo atualizado com sucesso', data: updateResult.rows[0] };
        }

        const insertResult = await client.query(`
          INSERT INTO contrato_produto_saldos
          (contrato_produto_id, modalidade_financeira_id, saldo_inicial, saldo_atual, quantidade_consumida, ativo, created_at, updated_at)
          VALUES ($1, $2, 0, 0, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id, contrato_produto_id, modalidade_financeira_id as modalidade_id,
            saldo_inicial as quantidade_inicial, quantidade_consumida,
            saldo_atual as quantidade_disponivel, ativo, created_at, updated_at
        `, [contrato_produto_id, modalidade_id]);

        if (quantidade > 0) {
          await registrarMovimentoContratoProduto(client, {
            contratoProdutoId: Number(contrato_produto_id),
            modalidadeFinanceiraId: Number(modalidade_id),
            tipoMovimento: "DISTRIBUICAO",
            quantidade,
            descricao: "Distribuicao inicial por modalidade financeira",
            origemTipo: "saldo_contrato_modalidade",
            origemId: Number(insertResult.rows[0].id),
            criadoPor: req.user?.id ?? null,
          });
        }

        const updateResult = await client.query(`
          UPDATE contrato_produto_saldos
          SET saldo_inicial = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING id, contrato_produto_id, modalidade_financeira_id as modalidade_id,
            saldo_inicial as quantidade_inicial, quantidade_consumida,
            saldo_atual as quantidade_disponivel, ativo, created_at, updated_at
        `, [quantidade, insertResult.rows[0].id]);

        return { message: 'Saldo cadastrado com sucesso', data: updateResult.rows[0] };
      });

      res.json({
        success: true,
        message: result.message,
        data: result.data
      });

    } catch (error) {
      console.error('❌ Erro ao cadastrar saldo por modalidade:', error);
      res.status((error as any)?.statusCode || 500).json({
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
          categorias_financeiras.ids[1] as categoria_financeira_id,
          categorias_financeiras.nomes as categoria_financeira_nome,
          categorias_financeiras.codigos as codigo_financeiro,
          COALESCE(categorias_financeiras.valor_repasse, 0) as valor_repasse,
          COALESCE(categorias_financeiras.parcelas, 1) as parcelas,
          m.ativo
        FROM modalidades m
        LEFT JOIN LATERAL (
          SELECT
            ARRAY_AGG(cfmv.id ORDER BY cfmv.nome) as ids,
            STRING_AGG(cfmv.nome, ', ' ORDER BY cfmv.nome) as nomes,
            STRING_AGG(cfmv.codigo_financeiro, ', ' ORDER BY cfmv.nome) FILTER (WHERE cfmv.codigo_financeiro IS NOT NULL) as codigos,
            SUM(COALESCE(cfmv.valor_repasse, 0)) as valor_repasse,
            MAX(COALESCE(cfmv.parcelas, 1)) as parcelas
          FROM modalidade_categorias_financeiras mcf
          JOIN categorias_financeiras_modalidade cfmv ON cfmv.id = mcf.categoria_financeira_id
          WHERE mcf.modalidade_id = m.id
            AND mcf.ativo = true
            AND cfmv.ativo = true
        ) categorias_financeiras ON true
        WHERE m.ativo = true
        ORDER BY m.nome
      `);

      res.json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      console.error('❌ Erro ao listar modalidades:', error);
      res.status((error as any)?.statusCode || 500).json({
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
          categorias_financeiras.ids[1] as categoria_financeira_id,
          categorias_financeiras.nomes as categoria_financeira_nome,
          categorias_financeiras.codigos as codigo_financeiro,
          COALESCE(SUM(em.quantidade_alunos), 0) as total_alunos,
          COUNT(em.id) as total_escolas,
          m.ativo
        FROM modalidades m
        LEFT JOIN LATERAL (
          SELECT
            ARRAY_AGG(cfmv.id ORDER BY cfmv.nome) as ids,
            STRING_AGG(cfmv.nome, ', ' ORDER BY cfmv.nome) as nomes,
            STRING_AGG(cfmv.codigo_financeiro, ', ' ORDER BY cfmv.nome) FILTER (WHERE cfmv.codigo_financeiro IS NOT NULL) as codigos
          FROM modalidade_categorias_financeiras mcf
          JOIN categorias_financeiras_modalidade cfmv ON cfmv.id = mcf.categoria_financeira_id
          WHERE mcf.modalidade_id = m.id
            AND mcf.ativo = true
            AND cfmv.ativo = true
        ) categorias_financeiras ON true
        LEFT JOIN escola_modalidades em ON m.id = em.modalidade_id
        LEFT JOIN escolas e ON em.escola_id = e.id
        WHERE m.ativo = true AND (e.ativo = true OR e.id IS NULL)
        GROUP BY m.id, m.nome, categorias_financeiras.ids, categorias_financeiras.nomes, categorias_financeiras.codigos, m.ativo
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
          cfm.id as categoria_financeira_id,
          cfm.nome as categoria_financeira_nome,
          cfm.codigo_financeiro as codigo_financeiro,
          cfm.valor_repasse as valor_repasse,
          cfm.parcelas as parcelas,
          COALESCE(SUM(em.quantidade_alunos), 0) as total_alunos,
          COUNT(DISTINCT em.escola_id) as total_escolas,
          ARRAY_AGG(DISTINCT m.nome ORDER BY m.nome) as modalidades_pedagogicas
        FROM modalidades m
        JOIN modalidade_categorias_financeiras mcf ON mcf.modalidade_id = m.id AND mcf.ativo = true
        JOIN categorias_financeiras_modalidade cfm ON cfm.id = mcf.categoria_financeira_id AND cfm.ativo = true
        LEFT JOIN escola_modalidades em ON m.id = em.modalidade_id
        LEFT JOIN escolas e ON em.escola_id = e.id
        WHERE m.ativo = true AND (e.ativo = true OR e.id IS NULL)
        GROUP BY
          cfm.id,
          cfm.nome,
          cfm.codigo_financeiro,
          cfm.valor_repasse,
          cfm.parcelas
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
            modalidade_financeira_id,
            saldo_inicial as quantidade_inicial,
            quantidade_consumida,
            saldo_atual as quantidade_disponivel
          FROM contrato_produto_saldos
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

        await registrarMovimentoContratoProduto(client, {
          contratoProdutoId: Number(saldo.contrato_produto_id),
          modalidadeFinanceiraId: saldo.modalidade_financeira_id === null ? null : Number(saldo.modalidade_financeira_id),
          tipoMovimento: "SAIDA_CONSUMO",
          quantidade: quantidadeNumerica,
          descricao: observacao || `Consumo manual em ${data_consumo || new Date().toISOString().split('T')[0]}`,
          origemTipo: "saldo_contrato_modalidade_manual",
          origemId: Number(id),
          criadoPor: req.user?.id ?? usuario_id ?? null,
        });

        const saldoAtualizadoResult = await client.query(`
          SELECT quantidade_consumida, saldo_atual as quantidade_disponivel
          FROM contrato_produto_saldos
          WHERE id = $1
        `, [id]);

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
          cpm.modalidade_financeira_id as modalidade_id,
          p.nome as produto_nome,
          COALESCE(um.codigo, 'UN') as unidade,
          m.nome as modalidade_nome,
          c.numero as contrato_numero
        FROM contrato_produto_saldos cpm
        JOIN contrato_produtos cp ON cpm.contrato_produto_id = cp.id
        JOIN produtos p ON cp.produto_id = p.id
        LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
        JOIN contratos c ON cp.contrato_id = c.id
        LEFT JOIN modalidades m ON cpm.modalidade_financeira_id = m.id
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
          tipo_movimento,
          direcao,
          quantidade,
          saldo_antes,
          saldo_depois,
          criado_em::date as data_consumo,
          descricao as observacao,
          criado_por as usuario_id,
          criado_em as created_at
        FROM contrato_produto_ledger
        WHERE contrato_produto_id = $1
          AND (
            (modalidade_financeira_id IS NULL AND $2::int IS NULL)
            OR modalidade_financeira_id = $2::int
          )
        ORDER BY criado_em DESC, id DESC
      `, [saldoResult.rows[0].contrato_produto_id, saldoResult.rows[0].modalidade_id]);

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
            l.id,
            l.contrato_produto_id,
            l.modalidade_financeira_id,
            l.quantidade
          FROM contrato_produto_ledger l
          JOIN contrato_produto_saldos s ON s.contrato_produto_id = l.contrato_produto_id
            AND (
              (s.modalidade_financeira_id IS NULL AND l.modalidade_financeira_id IS NULL)
              OR s.modalidade_financeira_id = l.modalidade_financeira_id
            )
          WHERE l.id = $1 AND s.id = $2
          FOR UPDATE
        `, [consumoId, id]);

        if (consumoResult.rows.length === 0) {
          const notFound = new Error('Registro de consumo nao encontrado');
          (notFound as any).statusCode = 404;
          throw notFound;
        }

        const consumo = consumoResult.rows[0];
        await registrarMovimentoContratoProduto(client, {
          contratoProdutoId: Number(consumo.contrato_produto_id),
          modalidadeFinanceiraId: consumo.modalidade_financeira_id === null ? null : Number(consumo.modalidade_financeira_id),
          tipoMovimento: "ESTORNO",
          quantidade: Number(consumo.quantidade),
          descricao: "Estorno de consumo manual",
          origemTipo: "saldo_contrato_modalidade_estorno",
          origemId: Number(id),
          movimentoReferenciadoId: Number(consumo.id),
          criadoPor: req.user?.id ?? null,
        });
      });

      res.json({
        success: true,
        message: 'Consumo estornado com sucesso'
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
