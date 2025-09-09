import { Pool } from 'pg';

export interface ContratoProduto {
  id?: number;
  contrato_id: number;
  produto_id: number;
  preco_unitario: number;
  quantidade_maxima?: number;
  quantidade?: number;
  ativo: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export class ContratoProdutoModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async criar(contratoProduto: Omit<ContratoProduto, 'id' | 'created_at' | 'updated_at'>): Promise<ContratoProduto> {
    const query = `
      INSERT INTO contratos_produtos (contrato_id, produto_id, preco_unitario, quantidade_maxima, quantidade, ativo)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      contratoProduto.contrato_id,
      contratoProduto.produto_id,
      contratoProduto.preco_unitario,
      contratoProduto.quantidade_maxima,
      contratoProduto.quantidade,
      contratoProduto.ativo
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async buscarPorContrato(contratoId: number): Promise<ContratoProduto[]> {
    const query = `
      SELECT cp.*, p.nome as produto_nome, p.unidade as unidade_medida
      FROM contratos_produtos cp
      JOIN produtos p ON cp.produto_id = p.id
      WHERE cp.contrato_id = $1 AND cp.ativo = true
      ORDER BY p.nome
    `;
    
    const result = await this.pool.query(query, [contratoId]);
    return result.rows;
  }

  async buscarPorId(id: number): Promise<ContratoProduto | null> {
    const query = 'SELECT * FROM contratos_produtos WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async atualizar(id: number, dados: Partial<ContratoProduto>): Promise<ContratoProduto | null> {
    const campos = Object.keys(dados).filter(key => key !== 'id');
    const valores = campos.map(campo => dados[campo as keyof ContratoProduto]);
    
    if (campos.length === 0) return null;

    const setClauses = campos.map((campo, index) => `${campo} = $${index + 2}`).join(', ');
    const query = `
      UPDATE contratos_produtos 
      SET ${setClauses}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, [id, ...valores]);
    return result.rows[0] || null;
  }

  async excluir(id: number): Promise<boolean> {
    const query = 'UPDATE contratos_produtos SET ativo = false WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }

  async verificarPreco(contratoId: number, produtoId: number): Promise<number | null> {
    const query = `
      SELECT preco_unitario 
      FROM contratos_produtos 
      WHERE contrato_id = $1 AND produto_id = $2 AND ativo = true
    `;
    
    const result = await this.pool.query(query, [contratoId, produtoId]);
    return result.rows[0]?.preco_unitario || null;
  }
}