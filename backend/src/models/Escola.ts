import { Pool } from 'pg';

export interface Escola {
  id?: number;
  nome: string;
  endereco: string;
  telefone?: string;
  email?: string;
  diretor?: string;
  codigo_inep?: string;
  ativa: boolean;
  observacoes?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface EscolaModalidade {
  id?: number;
  escola_id: number;
  modalidade: string;
  quantidade_alunos: number;
  turno: 'matutino' | 'vespertino' | 'noturno' | 'integral';
  ativa: boolean;
  created_at?: Date;
}

export class EscolaModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async criar(escola: Omit<Escola, 'id' | 'created_at' | 'updated_at'>): Promise<Escola> {
    const query = `
      INSERT INTO escolas (nome, endereco, telefone, email, diretor, codigo_inep, ativa, observacoes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      escola.nome,
      escola.endereco,
      escola.telefone,
      escola.email,
      escola.diretor,
      escola.codigo_inep,
      escola.ativa,
      escola.observacoes
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async buscarPorId(id: number): Promise<Escola | null> {
    const query = 'SELECT * FROM escolas WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async listar(ativa?: boolean): Promise<Escola[]> {
    let query = 'SELECT * FROM escolas';
    const values: any[] = [];

    if (ativa !== undefined) {
      query += ' WHERE ativa = $1';
      values.push(ativa);
    }

    query += ' ORDER BY nome';

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async atualizar(id: number, dados: Partial<Escola>): Promise<Escola | null> {
    const campos = Object.keys(dados).filter(key => key !== 'id');
    const valores = campos.map(campo => dados[campo as keyof Escola]);
    
    if (campos.length === 0) return null;

    const setClauses = campos.map((campo, index) => `${campo} = $${index + 2}`).join(', ');
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
    const query = 'UPDATE escolas SET ativa = false WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }

  async adicionarModalidade(modalidade: Omit<EscolaModalidade, 'id' | 'created_at'>): Promise<EscolaModalidade> {
    const query = `
      INSERT INTO escolas_modalidades (escola_id, modalidade, quantidade_alunos, turno, ativa)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      modalidade.escola_id,
      modalidade.modalidade,
      modalidade.quantidade_alunos,
      modalidade.turno,
      modalidade.ativa
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async buscarModalidades(escolaId: number): Promise<EscolaModalidade[]> {
    const query = `
      SELECT * FROM escolas_modalidades 
      WHERE escola_id = $1 AND ativa = true
      ORDER BY modalidade, turno
    `;
    
    const result = await this.pool.query(query, [escolaId]);
    return result.rows;
  }

  async atualizarModalidade(id: number, dados: Partial<EscolaModalidade>): Promise<EscolaModalidade | null> {
    const campos = Object.keys(dados).filter(key => key !== 'id');
    const valores = campos.map(campo => dados[campo as keyof EscolaModalidade]);
    
    if (campos.length === 0) return null;

    const setClauses = campos.map((campo, index) => `${campo} = $${index + 2}`).join(', ');
    const query = `
      UPDATE escolas_modalidades 
      SET ${setClauses}
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, [id, ...valores]);
    return result.rows[0] || null;
  }

  async removerModalidade(id: number): Promise<boolean> {
    const query = 'UPDATE escolas_modalidades SET ativa = false WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }

  async buscarPorCodigoInep(codigoInep: string): Promise<Escola | null> {
    const query = 'SELECT * FROM escolas WHERE codigo_inep = $1';
    const result = await this.pool.query(query, [codigoInep]);
    return result.rows[0] || null;
  }

  async obterEstatisticas(): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE ativa = true) as escolas_ativas,
        COUNT(*) FILTER (WHERE ativa = false) as escolas_inativas,
        COALESCE(SUM(em.quantidade_alunos), 0) as total_alunos
      FROM escolas e
      LEFT JOIN escolas_modalidades em ON e.id = em.escola_id AND em.ativa = true
      WHERE e.ativa = true
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
              'modalidade', em.modalidade,
              'quantidade_alunos', em.quantidade_alunos,
              'turno', em.turno
            )
          ) FILTER (WHERE em.id IS NOT NULL), 
          '[]'
        ) as modalidades
      FROM escolas e
      LEFT JOIN escolas_modalidades em ON e.id = em.escola_id AND em.ativa = true
      WHERE e.ativa = true
      GROUP BY e.id
      ORDER BY e.nome
    `;
    
    const result = await this.pool.query(query);
    return result.rows;
  }
}