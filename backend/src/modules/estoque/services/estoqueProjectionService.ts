import db from "../../../database";

export interface SchoolStockProjectionRow {
  produto_id: number;
  produto_nome: string;
  categoria: string | null;
  unidade: string;
  quantidade_atual: number;
  quantidade_minima: number;
  quantidade_maxima: number;
  data_ultima_atualizacao: string | null;
  observacoes: string | null;
}

export interface CentralStockProjectionRow {
  produto_id: number;
  produto_nome: string;
  produto_unidade: string;
  quantidade_total: number;
  quantidade_disponivel: number;
  quantidade_reservada: number;
  quantidade_vencida: number;
  lotes_ativos: number;
  proximo_vencimento: string | null;
}

export interface StockTimelineRow {
  id: number;
  escopo: "central" | "escola";
  escola_id?: number;
  escola_nome?: string | null;
  produto_id: number;
  produto_nome: string;
  tipo_evento: string;
  origem: string;
  quantidade_movimentada: number;
  data_movimentacao: string;
  usuario_nome?: string | null;
  motivo?: string | null;
  observacoes?: string | null;
}

function mapTimelineRow(row: any): StockTimelineRow {
  return {
    id: Number(row.id),
    escopo: row.escopo,
    escola_id: row.escola_id ? Number(row.escola_id) : undefined,
    escola_nome: row.escola_nome ?? null,
    produto_id: Number(row.produto_id),
    produto_nome: row.produto_nome,
    tipo_evento: row.tipo_evento,
    origem: row.origem,
    quantidade_movimentada: Number(row.quantidade_movimentada),
    data_movimentacao: row.data_movimentacao,
    usuario_nome: row.usuario_nome ?? null,
    motivo: row.motivo ?? null,
    observacoes: row.observacoes ?? null,
  };
}

class EstoqueProjectionService {
  async listarSaldoEscolar(escolaId: number): Promise<SchoolStockProjectionRow[]> {
    const result = await db.query(
      `
        SELECT
          p.id AS produto_id,
          p.nome AS produto_nome,
          p.categoria,
          COALESCE(um.codigo, 'UN') AS unidade,
          COALESCE(SUM(ee.quantidade_delta), 0) AS quantidade_atual,
          0::numeric AS quantidade_minima,
          0::numeric AS quantidade_maxima,
          MAX(ee.data_evento) AS data_ultima_atualizacao,
          NULL::text AS observacoes
        FROM produtos p
        LEFT JOIN unidades_medida um
          ON um.id = p.unidade_medida_id
        LEFT JOIN estoque_eventos ee
          ON ee.produto_id = p.id
         AND ee.escopo = 'escola'
         AND ee.escola_id = $1
        WHERE p.ativo = true
        GROUP BY p.id, p.nome, p.categoria, um.codigo
        ORDER BY p.nome
      `,
      [escolaId],
    );

    return result.rows.map((row) => ({
      produto_id: Number(row.produto_id),
      produto_nome: row.produto_nome,
      categoria: row.categoria ?? null,
      unidade: row.unidade,
      quantidade_atual: Number(row.quantidade_atual),
      quantidade_minima: Number(row.quantidade_minima),
      quantidade_maxima: Number(row.quantidade_maxima),
      data_ultima_atualizacao: row.data_ultima_atualizacao ?? null,
      observacoes: row.observacoes ?? null,
    }));
  }

  async listarSaldoCentral(options?: { mostrarTodos?: boolean }): Promise<CentralStockProjectionRow[]> {
    const result = await db.query(
      `
        WITH reservas AS (
          SELECT
            gpe.produto_id,
            SUM(GREATEST(gpe.quantidade - COALESCE(gpe.quantidade_total_entregue, 0), 0)) AS quantidade_reservada
          FROM guia_produto_escola gpe
          INNER JOIN guias g
            ON g.id = gpe.guia_id
          WHERE g.status = 'aberta'
            AND COALESCE(gpe.para_entrega, true) = true
            AND COALESCE(gpe.status, 'pendente') IN ('pendente', 'parcial')
          GROUP BY gpe.produto_id
        )
        SELECT
          p.id AS produto_id,
          p.nome AS produto_nome,
          COALESCE(um.codigo, 'UN') AS produto_unidade,
          COALESCE(SUM(ee.quantidade_delta), 0) AS quantidade_total,
          COALESCE(SUM(ee.quantidade_delta), 0) - COALESCE(r.quantidade_reservada, 0) AS quantidade_disponivel,
          COALESCE(r.quantidade_reservada, 0) AS quantidade_reservada,
          0::numeric AS quantidade_vencida,
          0::integer AS lotes_ativos,
          NULL::date AS proximo_vencimento
        FROM produtos p
        LEFT JOIN unidades_medida um
          ON um.id = p.unidade_medida_id
        LEFT JOIN estoque_eventos ee
          ON ee.produto_id = p.id
         AND ee.escopo = 'central'
        LEFT JOIN reservas r
          ON r.produto_id = p.id
        WHERE p.ativo = true
        GROUP BY p.id, p.nome, um.codigo, r.quantidade_reservada
        HAVING $1::boolean = true
            OR COALESCE(SUM(ee.quantidade_delta), 0) <> 0
            OR COALESCE(r.quantidade_reservada, 0) <> 0
            OR EXISTS (
              SELECT 1
              FROM estoque_eventos ee2
              WHERE ee2.produto_id = p.id
                AND ee2.escopo = 'central'
            )
        ORDER BY p.nome
      `,
      [options?.mostrarTodos === true],
    );

    return result.rows.map((row) => ({
      produto_id: Number(row.produto_id),
      produto_nome: row.produto_nome,
      produto_unidade: row.produto_unidade,
      quantidade_total: Number(row.quantidade_total),
      quantidade_disponivel: Number(row.quantidade_disponivel),
      quantidade_reservada: Number(row.quantidade_reservada),
      quantidade_vencida: Number(row.quantidade_vencida),
      lotes_ativos: Number(row.lotes_ativos),
      proximo_vencimento: row.proximo_vencimento ?? null,
    }));
  }

  async listarMovimentacoes(scope: "central" | "escola", options?: {
    escolaId?: number;
    produtoId?: number;
    limit?: number;
  }): Promise<StockTimelineRow[]> {
    const result = await db.query(
      `
        SELECT
          ee.id,
          ee.escopo,
          ee.escola_id,
          es.nome AS escola_nome,
          ee.produto_id,
          p.nome AS produto_nome,
          ee.tipo_evento,
          ee.origem,
          ee.quantidade_delta AS quantidade_movimentada,
          ee.data_evento AS data_movimentacao,
          ee.usuario_nome_snapshot AS usuario_nome,
          ee.motivo,
          ee.observacao AS observacoes
        FROM estoque_eventos ee
        INNER JOIN produtos p
          ON p.id = ee.produto_id
        LEFT JOIN escolas es
          ON es.id = ee.escola_id
        WHERE ee.escopo = $1
          AND ($2::integer IS NULL OR ee.escola_id = $2)
          AND ($3::integer IS NULL OR ee.produto_id = $3)
        ORDER BY ee.data_evento DESC, ee.id DESC
        LIMIT $4
      `,
      [
        scope,
        options?.escolaId ?? null,
        options?.produtoId ?? null,
        options?.limit ?? 50,
      ],
    );

    return result.rows.map(mapTimelineRow);
  }
}

export default new EstoqueProjectionService();
