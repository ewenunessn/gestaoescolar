import { Pool } from "pg";

export interface Escola {
  id?: number;
  nome: string;
  codigo: string;
  endereco?: string | null;
  municipio: string;
  endereco_maps?: string | null;
  telefone?: string | null;
  email?: string | null;
  nome_gestor?: string | null;
  administracao?: string | null;
  ativo: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface EscolaModalidade {
  id?: number;
  escola_id: number;
  modalidade_id: number;
  quantidade_alunos: number;
  created_at?: Date;
  updated_at?: Date;
}

type EscolaUpdateField =
  | "nome"
  | "codigo"
  | "endereco"
  | "municipio"
  | "endereco_maps"
  | "telefone"
  | "email"
  | "nome_gestor"
  | "administracao"
  | "ativo";

const escolaUpdateFields: EscolaUpdateField[] = [
  "nome",
  "codigo",
  "endereco",
  "municipio",
  "endereco_maps",
  "telefone",
  "email",
  "nome_gestor",
  "administracao",
  "ativo",
];

export class EscolaModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async criar(escola: Omit<Escola, "id" | "created_at" | "updated_at">): Promise<Escola> {
    const query = `
      INSERT INTO escolas (
        nome, codigo, endereco, municipio, endereco_maps,
        telefone, email, nome_gestor, administracao, ativo, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      escola.nome,
      escola.codigo,
      escola.endereco,
      escola.municipio,
      escola.endereco_maps,
      escola.telefone,
      escola.email,
      escola.nome_gestor,
      escola.administracao,
      escola.ativo,
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async buscarPorId(id: number): Promise<Escola | null> {
    const query = "SELECT * FROM escolas WHERE id = $1";
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async listar(ativo?: boolean): Promise<Escola[]> {
    let query = "SELECT * FROM escolas";
    const values: any[] = [];

    if (ativo !== undefined) {
      query += " WHERE ativo = $1";
      values.push(ativo);
    }

    query += " ORDER BY nome";

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async atualizar(id: number, dados: Partial<Escola>): Promise<Escola | null> {
    const campos = escolaUpdateFields.filter((campo) => dados[campo] !== undefined);
    const valores = campos.map((campo) => dados[campo]);

    if (campos.length === 0) return null;

    const setClauses = campos.map((campo, index) => `${campo} = $${index + 2}`).join(", ");
    const query = `
      UPDATE escolas
      SET ${setClauses}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, [id, ...valores]);
    return result.rows[0] || null;
  }

  async excluir(id: number): Promise<boolean> {
    const query = "UPDATE escolas SET ativo = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1";
    const result = await this.pool.query(query, [id]);
    return result.rowCount! > 0;
  }

  async adicionarModalidade(
    modalidade: Omit<EscolaModalidade, "id" | "created_at" | "updated_at">,
  ): Promise<EscolaModalidade> {
    const query = `
      INSERT INTO escola_modalidades (escola_id, modalidade_id, quantidade_alunos)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const values = [
      modalidade.escola_id,
      modalidade.modalidade_id,
      modalidade.quantidade_alunos,
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async buscarModalidades(escolaId: number): Promise<EscolaModalidade[]> {
    const query = `
      SELECT * FROM escola_modalidades
      WHERE escola_id = $1
      ORDER BY modalidade_id
    `;

    const result = await this.pool.query(query, [escolaId]);
    return result.rows;
  }

  async atualizarModalidade(id: number, dados: Partial<EscolaModalidade>): Promise<EscolaModalidade | null> {
    const campos = ["escola_id", "modalidade_id", "quantidade_alunos"].filter(
      (campo) => dados[campo as keyof EscolaModalidade] !== undefined,
    );
    const valores = campos.map((campo) => dados[campo as keyof EscolaModalidade]);

    if (campos.length === 0) return null;

    const setClauses = campos.map((campo, index) => `${campo} = $${index + 2}`).join(", ");
    const query = `
      UPDATE escola_modalidades
      SET ${setClauses}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, [id, ...valores]);
    return result.rows[0] || null;
  }

  async removerModalidade(id: number): Promise<boolean> {
    const query = "DELETE FROM escola_modalidades WHERE id = $1";
    const result = await this.pool.query(query, [id]);
    return result.rowCount! > 0;
  }

  async buscarPorCodigo(codigo: string): Promise<Escola | null> {
    const query = "SELECT * FROM escolas WHERE codigo = $1";
    const result = await this.pool.query(query, [codigo]);
    return result.rows[0] || null;
  }

  async buscarPorCodigoInep(codigoInep: string): Promise<Escola | null> {
    return this.buscarPorCodigo(codigoInep);
  }

  async obterEstatisticas(): Promise<any> {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE ativo = true) as escolas_ativas,
        COUNT(*) FILTER (WHERE ativo = false) as escolas_inativas,
        COALESCE(SUM(em.quantidade_alunos), 0) as total_alunos
      FROM escolas e
      LEFT JOIN escola_modalidades em ON e.id = em.escola_id
    `;

    const result = await this.pool.query(query);
    return result.rows[0];
  }

  async buscarComModalidades(): Promise<any[]> {
    const query = `
      SELECT
        e.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', em.id,
              'modalidade_id', em.modalidade_id,
              'modalidade_nome', m.nome,
              'quantidade_alunos', em.quantidade_alunos
            )
          ) FILTER (WHERE em.id IS NOT NULL),
          '[]'
        ) as modalidades
      FROM escolas e
      LEFT JOIN escola_modalidades em ON e.id = em.escola_id
      LEFT JOIN modalidades m ON em.modalidade_id = m.id
      WHERE e.ativo = true
      GROUP BY e.id
      ORDER BY e.nome
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }
}
