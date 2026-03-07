import db from "../../../database";

// Nome da tabela - usar demandas_escolas no Neon, demandas localmente
const TABLE_NAME = process.env.NODE_ENV === 'production' ? 'demandas_escolas' : 'demandas';

export interface Demanda {
  id: number;
  escola_id?: number;
  escola_nome: string;
  numero_oficio: string;
  data_solicitacao: string;
  data_semead: string;
  objeto: string;
  descricao_itens: string;
  data_resposta_semead?: string;
  dias_solicitacao: number;
  status: 'pendente' | 'enviado_semead' | 'atendido' | 'nao_atendido';
  observacoes?: string;
  usuario_criacao_id: number;
  created_at: string;
  updated_at: string;
}

export interface DemandaDetalhada extends Demanda {
  escola_nome: string;
  usuario_criacao_nome: string;
}

export const demandaModel = {
  async criar(demanda: Partial<Demanda>): Promise<Demanda> {
    const query = `
      INSERT INTO ${TABLE_NAME} (
        escola_id, escola_nome, numero_oficio, data_solicitacao,
        objeto, descricao_itens,
        status, observacoes, usuario_criacao_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *,
      CASE 
        WHEN data_semead IS NULL THEN NULL
        WHEN data_resposta_semead IS NOT NULL THEN 
          (data_resposta_semead::date - data_semead::date)::integer
        ELSE 
          (CURRENT_DATE - data_semead::date)::integer
      END as dias_solicitacao
    `;

    const values = [
      demanda.escola_id || null,
      demanda.escola_nome,
      demanda.numero_oficio,
      demanda.data_solicitacao,
      demanda.objeto,
      demanda.descricao_itens,
      demanda.status || 'pendente',
      demanda.observacoes || null,
      demanda.usuario_criacao_id || 1
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  },

  async listar(filtros: {
    escola_id?: number;
    escola_nome?: string;
    objeto?: string;
    status?: string;
    data_inicio?: string;
    data_fim?: string;
  } = {}): Promise<DemandaDetalhada[]> {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (filtros.escola_id) {
      paramCount++;
      whereClause += ` AND d.escola_id = $${paramCount}`;
      params.push(filtros.escola_id);
    }

    if (filtros.escola_nome) {
      paramCount++;
      whereClause += ` AND d.escola_nome ILIKE $${paramCount}`;
      params.push(`%${filtros.escola_nome}%`);
    }

    if (filtros.objeto) {
      paramCount++;
      whereClause += ` AND d.objeto ILIKE $${paramCount}`;
      params.push(`%${filtros.objeto}%`);
    }

    if (filtros.status) {
      paramCount++;
      whereClause += ` AND d.status = $${paramCount}`;
      params.push(filtros.status);
    }

    if (filtros.data_inicio) {
      paramCount++;
      whereClause += ` AND d.data_solicitacao >= $${paramCount}`;
      params.push(filtros.data_inicio);
    }

    if (filtros.data_fim) {
      paramCount++;
      whereClause += ` AND d.data_solicitacao <= $${paramCount}`;
      params.push(filtros.data_fim);
    }

    const query = `
      SELECT 
        d.*,
        u.nome as usuario_criacao_nome,
        CASE 
          WHEN d.data_semead IS NULL THEN NULL
          WHEN d.data_resposta_semead IS NOT NULL THEN 
            (d.data_resposta_semead::date - d.data_semead::date)::integer
          ELSE 
            (CURRENT_DATE - d.data_semead::date)::integer
        END as dias_solicitacao
      FROM ${TABLE_NAME} d
      LEFT JOIN usuarios u ON d.usuario_criacao_id = u.id
      ${whereClause}
      ORDER BY d.created_at DESC
    `;

    const result = await db.query(query, params);
    return result.rows;
  },

  async buscarPorId(id: number): Promise<DemandaDetalhada | null> {
    const query = `
      SELECT 
        d.*,
        u.nome as usuario_criacao_nome,
        CASE 
          WHEN d.data_semead IS NULL THEN NULL
          WHEN d.data_resposta_semead IS NOT NULL THEN 
            (d.data_resposta_semead::date - d.data_semead::date)::integer
          ELSE 
            (CURRENT_DATE - d.data_semead::date)::integer
        END as dias_solicitacao
      FROM ${TABLE_NAME} d
      LEFT JOIN usuarios u ON d.usuario_criacao_id = u.id
      WHERE d.id = $1
    `;

    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  },

  async atualizar(id: number, demanda: Partial<Demanda>): Promise<Demanda> {
    const campos = [];
    const valores = [];
    let paramCount = 0;

    if (demanda.escola_id !== undefined) {
      paramCount++;
      campos.push(`escola_id = $${paramCount}`);
      valores.push(demanda.escola_id);
    }

    if (demanda.escola_nome !== undefined) {
      paramCount++;
      campos.push(`escola_nome = $${paramCount}`);
      valores.push(demanda.escola_nome);
    }

    if (demanda.numero_oficio !== undefined) {
      paramCount++;
      campos.push(`numero_oficio = $${paramCount}`);
      valores.push(demanda.numero_oficio);
    }

    if (demanda.data_solicitacao !== undefined) {
      paramCount++;
      campos.push(`data_solicitacao = $${paramCount}`);
      valores.push(demanda.data_solicitacao);
    }

    if (demanda.data_semead !== undefined) {
      paramCount++;
      campos.push(`data_semead = $${paramCount}`);
      valores.push(demanda.data_semead);
    }

    if (demanda.objeto !== undefined) {
      paramCount++;
      campos.push(`objeto = $${paramCount}`);
      valores.push(demanda.objeto);
    }

    if (demanda.descricao_itens !== undefined) {
      paramCount++;
      campos.push(`descricao_itens = $${paramCount}`);
      valores.push(demanda.descricao_itens);
    }

    if (demanda.data_resposta_semead !== undefined) {
      paramCount++;
      campos.push(`data_resposta_semead = $${paramCount}`);
      valores.push(demanda.data_resposta_semead);
    }

    if (demanda.status !== undefined) {
      paramCount++;
      campos.push(`status = $${paramCount}`);
      valores.push(demanda.status);
    }

    if (demanda.observacoes !== undefined) {
      paramCount++;
      campos.push(`observacoes = $${paramCount}`);
      valores.push(demanda.observacoes);
    }

    if (campos.length === 0) {
      throw new Error('Nenhum campo para atualizar');
    }

    paramCount++;
    campos.push(`updated_at = CURRENT_TIMESTAMP`);
    valores.push(id);

    const query = `
      UPDATE ${TABLE_NAME} 
      SET ${campos.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *,
      CASE 
        WHEN data_semead IS NULL THEN NULL
        WHEN data_resposta_semead IS NOT NULL THEN 
          (data_resposta_semead::date - data_semead::date)::integer
        ELSE 
          (CURRENT_DATE - data_semead::date)::integer
      END as dias_solicitacao
    `;

    const result = await db.query(query, valores);
    return result.rows[0];
  },

  async excluir(id: number): Promise<void> {
    const query = `DELETE FROM ${TABLE_NAME} WHERE id = $1`;
    await db.query(query, [id]);
  },

  async atualizarStatus(id: number, status: string): Promise<Demanda> {
    const query = `
      UPDATE ${TABLE_NAME} 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *,
      CASE 
        WHEN data_semead IS NULL THEN NULL
        WHEN data_resposta_semead IS NOT NULL THEN 
          (data_resposta_semead::date - data_semead::date)::integer
        ELSE 
          (CURRENT_DATE - data_semead::date)::integer
      END as dias_solicitacao
    `;

    const result = await db.query(query, [status, id]);
    return result.rows[0];
  },

  async listarSolicitantes(): Promise<{ escola_nome: string; total_demandas: number }[]> {
    const query = `
      SELECT 
        escola_nome,
        COUNT(*) as total_demandas
      FROM ${TABLE_NAME}
      GROUP BY escola_nome
      ORDER BY total_demandas DESC, escola_nome ASC
    `;

    const result = await db.query(query);
    return result.rows;
  }
};

export default demandaModel;