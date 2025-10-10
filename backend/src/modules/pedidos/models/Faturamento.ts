import { Pool } from 'pg';

export interface Faturamento {
  id?: number;
  pedido_id: number;
  numero: string;
  data_faturamento: Date;
  status: 'gerado' | 'processado' | 'cancelado';
  valor_total: number;
  observacoes?: string;
  usuario_criacao_id: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface FaturamentoItem {
  id?: number;
  faturamento_id: number;
  pedido_item_id: number;
  modalidade_id: number;
  contrato_id: number;
  fornecedor_id: number;
  produto_id: number;
  quantidade_original: number;
  quantidade_modalidade: number;
  percentual_modalidade: number;
  preco_unitario: number;
  valor_total: number;
  created_at?: Date;
  updated_at?: Date;
}

export class FaturamentoModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async criar(faturamento: Omit<Faturamento, 'id' | 'created_at' | 'updated_at'>): Promise<Faturamento> {
    const query = `
      INSERT INTO faturamentos (
        pedido_id, numero, data_faturamento, status, valor_total, 
        observacoes, usuario_criacao_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      faturamento.pedido_id,
      faturamento.numero,
      faturamento.data_faturamento,
      faturamento.status,
      faturamento.valor_total,
      faturamento.observacoes,
      faturamento.usuario_criacao_id
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async criarItem(item: Omit<FaturamentoItem, 'id' | 'created_at' | 'updated_at'>): Promise<FaturamentoItem> {
    const query = `
      INSERT INTO faturamento_itens (
        faturamento_id, pedido_item_id, modalidade_id, contrato_id, 
        fornecedor_id, produto_id, quantidade_original, quantidade_modalidade,
        percentual_modalidade, preco_unitario, valor_total
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const values = [
      item.faturamento_id,
      item.pedido_item_id,
      item.modalidade_id,
      item.contrato_id,
      item.fornecedor_id,
      item.produto_id,
      item.quantidade_original,
      item.quantidade_modalidade,
      item.percentual_modalidade,
      item.preco_unitario,
      item.valor_total
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async buscarPorId(id: number): Promise<any | null> {
    const query = `
      SELECT 
        f.*,
        p.numero as pedido_numero,
        u.nome as usuario_criacao_nome
      FROM faturamentos f
      JOIN pedidos p ON f.pedido_id = p.id
      JOIN usuarios u ON f.usuario_criacao_id = u.id
      WHERE f.id = $1
    `;
    
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async buscarPorPedido(pedidoId: number): Promise<any[]> {
    const query = `
      SELECT 
        f.*,
        p.numero as pedido_numero,
        u.nome as usuario_criacao_nome
      FROM faturamentos f
      JOIN pedidos p ON f.pedido_id = p.id
      JOIN usuarios u ON f.usuario_criacao_id = u.id
      WHERE f.pedido_id = $1
      ORDER BY f.created_at DESC
    `;
    
    const result = await this.pool.query(query, [pedidoId]);
    return result.rows;
  }

  async buscarItens(faturamentoId: number): Promise<any[]> {
    const query = `
      SELECT 
        fi.*,
        m.nome as modalidade_nome,
        m.codigo_financeiro as modalidade_codigo_financeiro,
        c.numero as contrato_numero,
        f.nome as fornecedor_nome,
        f.cnpj as fornecedor_cnpj,
        pr.nome as produto_nome,
        pr.unidade as unidade_medida,
        fi.preco_unitario,
        fi.quantidade_modalidade
      FROM faturamento_itens fi
      JOIN modalidades m ON fi.modalidade_id = m.id
      JOIN contratos c ON fi.contrato_id = c.id
      JOIN fornecedores f ON fi.fornecedor_id = f.id
      JOIN produtos pr ON fi.produto_id = pr.id
      WHERE fi.faturamento_id = $1
      ORDER BY c.numero, m.nome, pr.nome
    `;
    
    const result = await this.pool.query(query, [faturamentoId]);
    return result.rows;
  }

  async listar(filtros?: {
    pedido_id?: number;
    status?: string;
    data_inicio?: Date;
    data_fim?: Date;
  }): Promise<any[]> {
    let query = `
      SELECT 
        f.*,
        p.numero as pedido_numero,
        u.nome as usuario_criacao_nome,
        COUNT(fi.id) as total_itens
      FROM faturamentos f
      JOIN pedidos p ON f.pedido_id = p.id
      JOIN usuarios u ON f.usuario_criacao_id = u.id
      LEFT JOIN faturamento_itens fi ON f.id = fi.faturamento_id
      WHERE 1=1
    `;
    
    const values: any[] = [];
    let paramCount = 1;

    if (filtros?.pedido_id) {
      query += ` AND f.pedido_id = $${paramCount}`;
      values.push(filtros.pedido_id);
      paramCount++;
    }

    if (filtros?.status) {
      query += ` AND f.status = $${paramCount}`;
      values.push(filtros.status);
      paramCount++;
    }

    if (filtros?.data_inicio) {
      query += ` AND f.data_faturamento >= $${paramCount}`;
      values.push(filtros.data_inicio);
      paramCount++;
    }

    if (filtros?.data_fim) {
      query += ` AND f.data_faturamento <= $${paramCount}`;
      values.push(filtros.data_fim);
      paramCount++;
    }

    query += ' GROUP BY f.id, p.numero, u.nome ORDER BY f.created_at DESC';

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async gerarNumero(): Promise<string> {
    const ano = new Date().getFullYear();
    const query = `
      SELECT COUNT(*) as total 
      FROM faturamentos 
      WHERE EXTRACT(YEAR FROM created_at) = $1
    `;
    
    const result = await this.pool.query(query, [ano]);
    const sequencial = (parseInt(result.rows[0].total) + 1).toString().padStart(6, '0');
    
    return `FAT${ano}${sequencial}`;
  }

  async atualizarStatus(id: number, status: string): Promise<boolean> {
    const query = `
      UPDATE faturamentos 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    const result = await this.pool.query(query, [status, id]);
    return result.rowCount > 0;
  }

  async excluir(id: number): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Verificar se o faturamento teve consumo registrado
      const faturamentoResult = await client.query(
        'SELECT status FROM faturamentos WHERE id = $1',
        [id]
      );
      
      const faturamento = faturamentoResult.rows[0];
      const consumoRegistrado = faturamento?.status === 'consumido';
      
      // Se o consumo foi registrado, restaurar saldos
      if (consumoRegistrado) {
        const itensQuery = `
          SELECT 
            fi.contrato_id,
            fi.produto_id,
            fi.modalidade_id,
            fi.quantidade_modalidade
          FROM faturamento_itens fi
          WHERE fi.faturamento_id = $1
        `;
        const itensResult = await client.query(itensQuery, [id]);
        
        // Restaurar saldos dos contratos
        for (const item of itensResult.rows) {
          await client.query(`
            UPDATE contrato_produtos_modalidades cpm
            SET quantidade_consumida = cpm.quantidade_consumida - $1
            FROM contrato_produtos cp
            WHERE cpm.contrato_produto_id = cp.id
              AND cp.contrato_id = $2
              AND cp.produto_id = $3
              AND cpm.modalidade_id = $4
              AND cpm.ativo = true
          `, [
            item.quantidade_modalidade,
            item.contrato_id,
            item.produto_id,
            item.modalidade_id
          ]);
        }
      }
      
      // Excluir itens do faturamento
      await client.query('DELETE FROM faturamento_itens WHERE faturamento_id = $1', [id]);
      
      // Excluir faturamento
      const result = await client.query('DELETE FROM faturamentos WHERE id = $1', [id]);
      
      await client.query('COMMIT');
      return result.rowCount > 0;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}