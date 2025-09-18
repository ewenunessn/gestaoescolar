import { Pool } from 'pg';

export interface Refeicao {
  id?: number;
  nome: string;
  descricao?: string;
  tipo: 'cafe_manha' | 'almoco' | 'lanche_tarde' | 'jantar' | 'ceia';
  horario_inicio: string;
  horario_fim: string;
  ativa: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface RefeicaoIngrediente {
  id?: number;
  refeicao_id: number;
  produto_id: number;
  quantidade_por_porcao: number;
  unidade_medida: string;
  observacoes?: string;
  created_at?: Date;
}

export class RefeicaoModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async criar(refeicao: Omit<Refeicao, 'id' | 'created_at' | 'updated_at'>): Promise<Refeicao> {
    const query = `
      INSERT INTO refeicoes (nome, descricao, tipo, horario_inicio, horario_fim, ativa)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      refeicao.nome,
      refeicao.descricao,
      refeicao.tipo,
      refeicao.horario_inicio,
      refeicao.horario_fim,
      refeicao.ativa
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async buscarPorId(id: number): Promise<Refeicao | null> {
    const query = 'SELECT * FROM refeicoes WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async listar(ativa?: boolean): Promise<Refeicao[]> {
    let query = 'SELECT * FROM refeicoes';
    const values: any[] = [];

    if (ativa !== undefined) {
      query += ' WHERE ativa = $1';
      values.push(ativa);
    }

    query += ' ORDER BY horario_inicio';

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async atualizar(id: number, dados: Partial<Refeicao>): Promise<Refeicao | null> {
    const campos = Object.keys(dados).filter(key => key !== 'id');
    const valores = campos.map(campo => dados[campo as keyof Refeicao]);
    
    if (campos.length === 0) return null;

    const setClauses = campos.map((campo, index) => `${campo} = $${index + 2}`).join(', ');
    const query = `
      UPDATE refeicoes 
      SET ${setClauses}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, [id, ...valores]);
    return result.rows[0] || null;
  }

  async excluir(id: number): Promise<boolean> {
    const query = 'UPDATE refeicoes SET ativa = false WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }

  async adicionarIngrediente(ingrediente: Omit<RefeicaoIngrediente, 'id' | 'created_at'>): Promise<RefeicaoIngrediente> {
    const query = `
      INSERT INTO refeicoes_ingredientes (refeicao_id, produto_id, quantidade_por_porcao, unidade_medida, observacoes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      ingrediente.refeicao_id,
      ingrediente.produto_id,
      ingrediente.quantidade_por_porcao,
      ingrediente.unidade_medida,
      ingrediente.observacoes
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async buscarIngredientes(refeicaoId: number): Promise<any[]> {
    const query = `
      SELECT ri.*, p.nome as produto_nome, p.categoria
      FROM refeicoes_ingredientes ri
      JOIN produtos p ON ri.produto_id = p.id
      WHERE ri.refeicao_id = $1
      ORDER BY p.nome
    `;
    
    const result = await this.pool.query(query, [refeicaoId]);
    return result.rows;
  }

  async atualizarIngrediente(id: number, dados: Partial<RefeicaoIngrediente>): Promise<RefeicaoIngrediente | null> {
    const campos = Object.keys(dados).filter(key => key !== 'id');
    const valores = campos.map(campo => dados[campo as keyof RefeicaoIngrediente]);
    
    if (campos.length === 0) return null;

    const setClauses = campos.map((campo, index) => `${campo} = $${index + 2}`).join(', ');
    const query = `
      UPDATE refeicoes_ingredientes 
      SET ${setClauses}
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, [id, ...valores]);
    return result.rows[0] || null;
  }

  async removerIngrediente(id: number): Promise<boolean> {
    const query = 'DELETE FROM refeicoes_ingredientes WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }

  async buscarPorTipo(tipo: string): Promise<Refeicao[]> {
    const query = 'SELECT * FROM refeicoes WHERE tipo = $1 AND ativa = true ORDER BY horario_inicio';
    const result = await this.pool.query(query, [tipo]);
    return result.rows;
  }

  async calcularCustoRefeicao(refeicaoId: number): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(ri.quantidade_por_porcao * p.preco_medio), 0) as custo_total
      FROM refeicoes_ingredientes ri
      JOIN produtos p ON ri.produto_id = p.id
      WHERE ri.refeicao_id = $1
    `;
    
    const result = await this.pool.query(query, [refeicaoId]);
    return parseFloat(result.rows[0].custo_total) || 0;
  }

  async buscarComIngredientes(): Promise<any[]> {
    const query = `
      SELECT 
        r.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ri.id,
              'produto_id', ri.produto_id,
              'produto_nome', p.nome,
              'quantidade_por_porcao', ri.quantidade_por_porcao,
              'unidade_medida', ri.unidade_medida,
              'observacoes', ri.observacoes
            )
          ) FILTER (WHERE ri.id IS NOT NULL), 
          '[]'
        ) as ingredientes
      FROM refeicoes r
      LEFT JOIN refeicoes_ingredientes ri ON r.id = ri.refeicao_id
      LEFT JOIN produtos p ON ri.produto_id = p.id
      WHERE r.ativa = true
      GROUP BY r.id
      ORDER BY r.horario_inicio
    `;
    
    const result = await this.pool.query(query);
    return result.rows;
  }

  async obterEstatisticas(): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE ativa = true) as refeicoes_ativas,
        COUNT(*) FILTER (WHERE ativa = false) as refeicoes_inativas,
        COUNT(*) FILTER (WHERE tipo = 'cafe_manha') as cafe_manha,
        COUNT(*) FILTER (WHERE tipo = 'almoco') as almoco,
        COUNT(*) FILTER (WHERE tipo = 'lanche_tarde') as lanche_tarde,
        COUNT(*) FILTER (WHERE tipo = 'jantar') as jantar
      FROM refeicoes
    `;
    
    const result = await this.pool.query(query);
    return result.rows[0];
  }
}