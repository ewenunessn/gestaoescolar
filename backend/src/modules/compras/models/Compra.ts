import { Pool } from 'pg';

export interface Pedido {
  id?: number;
  numero: string;
  contrato_id: number;
  escola_id: number;
  data_pedido: Date;
  data_entrega_prevista?: Date;
  status: 'rascunho' | 'pendente' | 'aprovado' | 'em_separacao' | 'enviado' | 'entregue' | 'cancelado';
  valor_total: number;
  observacoes?: string;
  usuario_criacao_id: number;
  usuario_aprovacao_id?: number;
  data_aprovacao?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export class PedidoModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async criar(pedido: Omit<Pedido, 'id' | 'created_at' | 'updated_at'>): Promise<Pedido> {
    const query = `
      INSERT INTO pedidos (
        numero, contrato_id, escola_id, data_pedido, data_entrega_prevista,
        status, valor_total, observacoes, usuario_criacao_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      pedido.numero,
      pedido.contrato_id,
      pedido.escola_id,
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

  async buscarPorId(id: number): Promise<any | null> {
    const query = `
      SELECT 
        p.*,
        c.numero as contrato_numero,
        f.nome as fornecedor_nome,
        e.nome as escola_nome,
        u.nome as usuario_criacao_nome,
        ua.nome as usuario_aprovacao_nome
      FROM pedidos p
      JOIN contratos c ON p.contrato_id = c.id
      JOIN fornecedores f ON c.fornecedor_id = f.id
      JOIN escolas e ON p.escola_id = e.id
      JOIN usuarios u ON p.usuario_criacao_id = u.id
      LEFT JOIN usuarios ua ON p.usuario_aprovacao_id = ua.id
      WHERE p.id = $1
    `;
    
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async listar(filtros?: {
    contrato_id?: number;
    escola_id?: number;
    status?: string;
    data_inicio?: Date;
    data_fim?: Date;
  }): Promise<any[]> {
    let query = `
      SELECT 
        p.*,
        c.numero as contrato_numero,
        f.nome as fornecedor_nome,
        e.nome as escola_nome,
        u.nome as usuario_criacao_nome,
        COUNT(pi.id) as total_itens
      FROM pedidos p
      JOIN contratos c ON p.contrato_id = c.id
      JOIN fornecedores f ON c.fornecedor_id = f.id
      JOIN escolas e ON p.escola_id = e.id
      JOIN usuarios u ON p.usuario_criacao_id = u.id
      LEFT JOIN pedido_itens pi ON p.id = pi.pedido_id
      WHERE 1=1
    `;
    
    const values: any[] = [];
    let paramCount = 1;

    if (filtros?.contrato_id) {
      query += ` AND p.contrato_id = $${paramCount}`;
      values.push(filtros.contrato_id);
      paramCount++;
    }

    if (filtros?.escola_id) {
      query += ` AND p.escola_id = $${paramCount}`;
      values.push(filtros.escola_id);
      paramCount++;
    }

    if (filtros?.status) {
      query += ` AND p.status = $${paramCount}`;
      values.push(filtros.status);
      paramCount++;
    }

    if (filtros?.data_inicio) {
      query += ` AND p.data_pedido >= $${paramCount}`;
      values.push(filtros.data_inicio);
      paramCount++;
    }

    if (filtros?.data_fim) {
      query += ` AND p.data_pedido <= $${paramCount}`;
      values.push(filtros.data_fim);
      paramCount++;
    }

    query += ' GROUP BY p.id, c.numero, f.nome, e.nome, u.nome ORDER BY p.created_at DESC';

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async atualizar(id: number, dados: Partial<Pedido>): Promise<Pedido | null> {
    const campos = Object.keys(dados).filter(key => key !== 'id');
    const valores = campos.map(campo => dados[campo as keyof Pedido]);
    
    if (campos.length === 0) return null;

    const setClauses = campos.map((campo, index) => `${campo} = $${index + 2}`).join(', ');
    const query = `
      UPDATE pedidos 
      SET ${setClauses}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, [id, ...valores]);
    return result.rows[0] || null;
  }

  async atualizarStatus(id: number, status: string, usuarioId?: number): Promise<boolean> {
    let query = `
      UPDATE pedidos 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
    `;
    
    const values: any[] = [status];
    let paramCount = 2;

    if (status === 'aprovado' && usuarioId) {
      query += `, usuario_aprovacao_id = $${paramCount}, data_aprovacao = CURRENT_TIMESTAMP`;
      values.push(usuarioId);
      paramCount++;
    }

    query += ` WHERE id = $${paramCount}`;
    values.push(id);

    const result = await this.pool.query(query, values);
    return result.rowCount > 0;
  }

  async gerarNumero(): Promise<string> {
    const ano = new Date().getFullYear();
    const query = `
      SELECT COUNT(*) as total 
      FROM pedidos 
      WHERE EXTRACT(YEAR FROM created_at) = $1
    `;
    
    const result = await this.pool.query(query, [ano]);
    const sequencial = (parseInt(result.rows[0].total) + 1).toString().padStart(6, '0');
    
    return `PED${ano}${sequencial}`;
  }

  async obterEstatisticas(): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total_pedidos,
        COUNT(*) FILTER (WHERE status = 'pendente') as pendentes,
        COUNT(*) FILTER (WHERE status = 'aprovado') as aprovados,
        COUNT(*) FILTER (WHERE status = 'entregue') as entregues,
        COUNT(*) FILTER (WHERE status = 'cancelado') as cancelados,
        SUM(valor_total) as valor_total,
        SUM(valor_total) FILTER (WHERE status = 'aprovado') as valor_aprovado,
        SUM(valor_total) FILTER (WHERE status = 'entregue') as valor_entregue
      FROM pedidos
    `;
    
    const result = await this.pool.query(query);
    return result.rows[0];
  }
}
