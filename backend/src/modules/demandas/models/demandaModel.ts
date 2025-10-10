const db = require('../../../database');

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
          CASE 
            WHEN data_resposta_semead::date = data_semead::date THEN 0
            ELSE (data_resposta_semead::date - data_semead::date)::integer
          END
        WHEN data_semead::date = CURRENT_DATE THEN 0
        ELSE (CURRENT_DATE - data_semead::date)::integer
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
      demanda.observacoes,
      demanda.usuario_criacao_id || 1
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  },

  async buscarPorId(id: number): Promise<DemandaDetalhada | null> {
    const query = `
      SELECT 
        d.*,
        COALESCE(d.escola_nome, e.nome) as escola_nome,
        u.nome as usuario_criacao_nome,
        CASE 
          WHEN d.data_semead IS NULL THEN NULL
          WHEN d.data_resposta_semead IS NOT NULL THEN 
            CASE 
              WHEN d.data_resposta_semead::date = d.data_semead::date THEN 0
              ELSE (d.data_resposta_semead::date - d.data_semead::date)::integer
            END
          WHEN d.data_semead::date = CURRENT_DATE THEN 0
          ELSE (CURRENT_DATE - d.data_semead::date)::integer
        END as dias_solicitacao
      FROM ${TABLE_NAME} d
      LEFT JOIN escolas e ON d.escola_id = e.id
      LEFT JOIN usuarios u ON d.usuario_criacao_id = u.id
      WHERE d.id = $1
    `;

    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  },

  async listar(filtros?: {
    escola_id?: number;
    escola_nome?: string;
    objeto?: string;
    status?: string;
    data_inicio?: string;
    data_fim?: string;
  }): Promise<DemandaDetalhada[]> {
    let query = `
      SELECT 
        d.*,
        COALESCE(d.escola_nome, e.nome) as escola_nome,
        u.nome as usuario_criacao_nome,
        CASE 
          WHEN d.data_semead IS NULL THEN NULL
          WHEN d.data_resposta_semead IS NOT NULL THEN 
            CASE 
              WHEN d.data_resposta_semead::date = d.data_semead::date THEN 0
              ELSE (d.data_resposta_semead::date - d.data_semead::date)::integer
            END
          WHEN d.data_semead::date = CURRENT_DATE THEN 0
          ELSE (CURRENT_DATE - d.data_semead::date)::integer
        END as dias_solicitacao
      FROM ${TABLE_NAME} d
      LEFT JOIN escolas e ON d.escola_id = e.id
      LEFT JOIN usuarios u ON d.usuario_criacao_id = u.id
      WHERE 1=1
    `;

    const values: any[] = [];
    let paramCount = 1;

    if (filtros?.escola_id) {
      query += ` AND d.escola_id = $${paramCount}`;
      values.push(filtros.escola_id);
      paramCount++;
    }

    if (filtros?.escola_nome) {
      query += ` AND COALESCE(d.escola_nome, e.nome) ILIKE $${paramCount}`;
      values.push(`%${filtros.escola_nome}%`);
      paramCount++;
    }

    if (filtros?.objeto) {
      query += ` AND d.objeto ILIKE $${paramCount}`;
      values.push(`%${filtros.objeto}%`);
      paramCount++;
    }

    if (filtros?.status) {
      query += ` AND d.status = $${paramCount}`;
      values.push(filtros.status);
      paramCount++;
    }

    if (filtros?.data_inicio) {
      query += ` AND d.data_solicitacao >= $${paramCount}`;
      values.push(filtros.data_inicio);
      paramCount++;
    }

    if (filtros?.data_fim) {
      query += ` AND d.data_solicitacao <= $${paramCount}`;
      values.push(filtros.data_fim);
      paramCount++;
    }

    query += ' ORDER BY d.data_solicitacao DESC, d.created_at DESC';

    const result = await db.query(query, values);
    return result.rows;
  },

  async atualizar(id: number, dados: Partial<Demanda>): Promise<Demanda> {
    const campos: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (dados.escola_id !== undefined) {
      campos.push(`escola_id = $${paramCount}`);
      values.push(dados.escola_id);
      paramCount++;
    }

    if (dados.escola_nome !== undefined) {
      campos.push(`escola_nome = $${paramCount}`);
      values.push(dados.escola_nome);
      paramCount++;
    }

    if (dados.numero_oficio !== undefined) {
      campos.push(`numero_oficio = $${paramCount}`);
      values.push(dados.numero_oficio);
      paramCount++;
    }

    if (dados.data_solicitacao !== undefined) {
      campos.push(`data_solicitacao = $${paramCount}`);
      values.push(dados.data_solicitacao);
      paramCount++;
    }

    if (dados.data_semead !== undefined) {
      campos.push(`data_semead = $${paramCount}`);
      values.push(dados.data_semead);
      paramCount++;
    }

    if (dados.objeto !== undefined) {
      campos.push(`objeto = $${paramCount}`);
      values.push(dados.objeto);
      paramCount++;
    }

    if (dados.descricao_itens !== undefined) {
      campos.push(`descricao_itens = $${paramCount}`);
      values.push(dados.descricao_itens);
      paramCount++;
    }

    if (dados.data_resposta_semead !== undefined) {
      campos.push(`data_resposta_semead = $${paramCount}`);
      values.push(dados.data_resposta_semead);
      paramCount++;
    }



    if (dados.status !== undefined) {
      campos.push(`status = $${paramCount}`);
      values.push(dados.status);
      paramCount++;
    }

    if (dados.observacoes !== undefined) {
      campos.push(`observacoes = $${paramCount}`);
      values.push(dados.observacoes);
      paramCount++;
    }

    campos.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(id);
    const query = `
      UPDATE ${TABLE_NAME} 
      SET ${campos.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *,
      CASE 
        WHEN data_semead IS NULL THEN NULL
        WHEN data_resposta_semead IS NOT NULL THEN 
          CASE 
            WHEN data_resposta_semead::date = data_semead::date THEN 0
            ELSE (data_resposta_semead::date - data_semead::date)::integer
          END
        WHEN data_semead::date = CURRENT_DATE THEN 0
        ELSE (CURRENT_DATE - data_semead::date)::integer
      END as dias_solicitacao
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  },

  async excluir(id: number): Promise<void> {
    await db.query(`DELETE FROM ${TABLE_NAME} WHERE id = $1`, [id]);
  },

  async listarSolicitantes(): Promise<string[]> {
    const query = `
      SELECT DISTINCT COALESCE(d.escola_nome, e.nome) as escola_nome
      FROM ${TABLE_NAME} d
      LEFT JOIN escolas e ON d.escola_id = e.id
      WHERE COALESCE(d.escola_nome, e.nome) IS NOT NULL
      ORDER BY escola_nome
    `;
    
    const result = await db.query(query);
    return result.rows.map(row => row.escola_nome);
  }
};
