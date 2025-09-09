import { Pool } from 'pg';

export interface PedidoModerno {
  id?: number;
  escola_id: number;
  fornecedor_id: number;
  contrato_id?: number;
  data_pedido: Date;
  data_entrega_prevista: Date;
  status: 'rascunho' | 'pendente' | 'aprovado' | 'em_producao' | 'em_transito' | 'entregue' | 'cancelado';
  valor_total: number;
  observacoes?: string;
  usuario_criacao_id: number;
  usuario_aprovacao_id?: number;
  data_aprovacao?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface ItemPedidoModerno {
  id?: number;
  pedido_id: number;
  produto_id: number;
  quantidade: number;
  preco_unitario: number;
  valor_total: number;
  observacoes?: string;
  created_at?: Date;
}

export class PedidoModernoModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async criar(pedido: Omit<PedidoModerno, 'id' | 'created_at' | 'updated_at'>): Promise<PedidoModerno> {
    const query = `
      INSERT INTO pedidos_modernos (
        escola_id, fornecedor_id, contrato_id, data_pedido, data_entrega_prevista,
        status, valor_total, observacoes, usuario_criacao_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      pedido.escola_id,
      pedido.fornecedor_id,
      pedido.contrato_id,
      pedido.data_pedido,
      pedido.data_entrega_prevista,
      pedido.status,
      pedido.valor_total,
      pedido.observacoes,
      pedido.usuario_criacao_id
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async adicionarItem(item: Omit<ItemPedidoModerno, 'id' | 'created_at'>): Promise<ItemPedidoModerno> {
    const query = `
      INSERT INTO pedidos_modernos_itens (
        pedido_id, produto_id, quantidade, preco_unitario, valor_total, observacoes
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      item.pedido_id,
      item.produto_id,
      item.quantidade,
      item.preco_unitario,
      item.valor_total,
      item.observacoes
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async buscarPorId(id: number): Promise<PedidoModerno | null> {
    const query = `
      SELECT pm.*, 
             e.nome as escola_nome,
             f.nome as fornecedor_nome,
             u.nome as usuario_criacao_nome
      FROM pedidos_modernos pm
      JOIN escolas e ON pm.escola_id = e.id
      JOIN fornecedores f ON pm.fornecedor_id = f.id
      JOIN usuarios u ON pm.usuario_criacao_id = u.id
      WHERE pm.id = $1
    `;
    
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async buscarItens(pedidoId: number): Promise<ItemPedidoModerno[]> {
    const query = `
      SELECT pmi.*, p.nome as produto_nome, p.unidade as unidade_medida
      FROM pedidos_modernos_itens pmi
      JOIN produtos p ON pmi.produto_id = p.id
      WHERE pmi.pedido_id = $1
      ORDER BY p.nome
    `;
    
    const result = await this.pool.query(query, [pedidoId]);
    return result.rows;
  }

  async listar(filtros?: {
    escola_id?: number;
    fornecedor_id?: number;
    status?: string;
    data_inicio?: Date;
    data_fim?: Date;
  }): Promise<PedidoModerno[]> {
    let query = `
      SELECT pm.*, 
             e.nome as escola_nome,
             f.nome as fornecedor_nome,
             u.nome as usuario_criacao_nome
      FROM pedidos_modernos pm
      JOIN escolas e ON pm.escola_id = e.id
      JOIN fornecedores f ON pm.fornecedor_id = f.id
      JOIN usuarios u ON pm.usuario_criacao_id = u.id
      WHERE 1=1
    `;
    
    const values: any[] = [];
    let paramCount = 1;

    if (filtros?.escola_id) {
      query += ` AND pm.escola_id = $${paramCount}`;
      values.push(filtros.escola_id);
      paramCount++;
    }

    if (filtros?.fornecedor_id) {
      query += ` AND pm.fornecedor_id = $${paramCount}`;
      values.push(filtros.fornecedor_id);
      paramCount++;
    }

    if (filtros?.status) {
      query += ` AND pm.status = $${paramCount}`;
      values.push(filtros.status);
      paramCount++;
    }

    if (filtros?.data_inicio) {
      query += ` AND pm.data_pedido >= $${paramCount}`;
      values.push(filtros.data_inicio);
      paramCount++;
    }

    if (filtros?.data_fim) {
      query += ` AND pm.data_pedido <= $${paramCount}`;
      values.push(filtros.data_fim);
      paramCount++;
    }

    query += ' ORDER BY pm.created_at DESC';

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async atualizarStatus(id: number, status: string, usuarioId?: number): Promise<PedidoModerno | null> {
    let query = `
      UPDATE pedidos_modernos 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
    `;
    
    const values = [status];
    let paramCount = 2;

    if (status === 'aprovado' && usuarioId) {
      query += `, usuario_aprovacao_id = $${paramCount}, data_aprovacao = CURRENT_TIMESTAMP`;
      values.push(usuarioId.toString());
      paramCount++;
    }

    query += ` WHERE id = $${paramCount} RETURNING *`;
    values.push(id.toString());

    const result = await this.pool.query(query, values);
    return result.rows[0] || null;
  }

  async calcularValorTotal(pedidoId: number): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(valor_total), 0) as total
      FROM pedidos_modernos_itens
      WHERE pedido_id = $1
    `;
    
    const result = await this.pool.query(query, [pedidoId]);
    return parseFloat(result.rows[0].total) || 0;
  }

  async atualizarValorTotal(pedidoId: number): Promise<void> {
    const valorTotal = await this.calcularValorTotal(pedidoId);
    
    await this.pool.query(
      'UPDATE pedidos_modernos SET valor_total = $1 WHERE id = $2',
      [valorTotal, pedidoId]
    );
  }

  async excluir(id: number): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Excluir itens primeiro
      await client.query('DELETE FROM pedidos_modernos_itens WHERE pedido_id = $1', [id]);
      
      // Excluir pedido
      const result = await client.query('DELETE FROM pedidos_modernos WHERE id = $1', [id]);
      
      await client.query('COMMIT');
      return result.rowCount > 0;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async removerItem(itemId: number): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM pedidos_modernos_itens WHERE id = $1', [itemId]);
    return result.rowCount > 0;
  }
}