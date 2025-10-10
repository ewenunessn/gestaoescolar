import { Pool } from 'pg';

export interface PedidoItem {
  id?: number;
  pedido_id: number;
  contrato_produto_id: number;
  produto_id: number;
  quantidade: number;
  preco_unitario: number;
  valor_total: number;
  observacoes?: string;
  created_at?: Date;
  updated_at?: Date;
}

export class PedidoItemModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async criar(item: Omit<PedidoItem, 'id' | 'created_at' | 'updated_at'>): Promise<PedidoItem> {
    const query = `
      INSERT INTO pedido_itens (
        pedido_id, contrato_produto_id, produto_id, quantidade,
        preco_unitario, valor_total, observacoes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      item.pedido_id,
      item.contrato_produto_id,
      item.produto_id,
      item.quantidade,
      item.preco_unitario,
      item.valor_total,
      item.observacoes
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async buscarPorPedido(pedidoId: number): Promise<any[]> {
    const query = `
      SELECT 
        pi.*,
        p.nome as produto_nome,
        p.unidade as unidade ,
        p.unidade as unidade,
        cp.quantidade_contratada,
        cp.preco_unitario as preco_contrato
      FROM pedido_itens pi
      JOIN produtos p ON pi.produto_id = p.id
      JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
      WHERE pi.pedido_id = $1
      ORDER BY p.nome
    `;
    
    const result = await this.pool.query(query, [pedidoId]);
    return result.rows;
  }

  async buscarPorId(id: number): Promise<PedidoItem | null> {
    const query = 'SELECT * FROM pedido_itens WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async atualizar(id: number, dados: Partial<PedidoItem>): Promise<PedidoItem | null> {
    const campos = Object.keys(dados).filter(key => key !== 'id');
    const valores = campos.map(campo => dados[campo as keyof PedidoItem]);
    
    if (campos.length === 0) return null;

    const setClauses = campos.map((campo, index) => `${campo} = $${index + 2}`).join(', ');
    const query = `
      UPDATE pedido_itens 
      SET ${setClauses}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, [id, ...valores]);
    return result.rows[0] || null;
  }

  async excluir(id: number): Promise<boolean> {
    const query = 'DELETE FROM pedido_itens WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }

  async excluirPorPedido(pedidoId: number): Promise<boolean> {
    const query = 'DELETE FROM pedido_itens WHERE pedido_id = $1';
    const result = await this.pool.query(query, [pedidoId]);
    return result.rowCount > 0;
  }

  async calcularValorTotal(pedidoId: number): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(valor_total), 0) as total
      FROM pedido_itens
      WHERE pedido_id = $1
    `;
    
    const result = await this.pool.query(query, [pedidoId]);
    return parseFloat(result.rows[0].total);
  }
}
