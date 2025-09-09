import { Pool } from 'pg';

export interface Contrato {
  id?: number;
  numero: string;
  fornecedor_id: number;
  data_inicio: Date;
  data_fim: Date;
  valor_total: number;
  saldo_disponivel: number;
  status: 'ativo' | 'inativo' | 'suspenso' | 'finalizado';
  observacoes?: string;
  tipo_contrato: 'fornecimento' | 'servico' | 'misto';
  created_at?: Date;
  updated_at?: Date;
}

export class ContratoModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async criar(contrato: Omit<Contrato, 'id' | 'created_at' | 'updated_at'>): Promise<Contrato> {
    const query = `
      INSERT INTO contratos (
        numero, fornecedor_id, data_inicio, data_fim, valor_total,
        saldo_disponivel, status, observacoes, tipo_contrato
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      contrato.numero,
      contrato.fornecedor_id,
      contrato.data_inicio,
      contrato.data_fim,
      contrato.valor_total,
      contrato.saldo_disponivel,
      contrato.status,
      contrato.observacoes,
      contrato.tipo_contrato
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async buscarPorId(id: number): Promise<Contrato | null> {
    const query = `
      SELECT c.*, f.nome as fornecedor_nome, f.cnpj as fornecedor_cnpj
      FROM contratos c
      JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE c.id = $1
    `;
    
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async listar(filtros?: {
    fornecedor_id?: number;
    status?: string;
    ativo?: boolean;
  }): Promise<Contrato[]> {
    let query = `
      SELECT c.*, f.nome as fornecedor_nome, f.cnpj as fornecedor_cnpj
      FROM contratos c
      JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE 1=1
    `;
    
    const values: any[] = [];
    let paramCount = 1;

    if (filtros?.fornecedor_id) {
      query += ` AND c.fornecedor_id = $${paramCount}`;
      values.push(filtros.fornecedor_id);
      paramCount++;
    }

    if (filtros?.status) {
      query += ` AND c.status = $${paramCount}`;
      values.push(filtros.status);
      paramCount++;
    }

    if (filtros?.ativo !== undefined) {
      query += ` AND c.status ${filtros.ativo ? '= \'ativo\'' : '!= \'ativo\''}`;
    }

    query += ' ORDER BY c.created_at DESC';

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async atualizar(id: number, dados: Partial<Contrato>): Promise<Contrato | null> {
    const campos = Object.keys(dados).filter(key => key !== 'id');
    const valores = campos.map(campo => dados[campo as keyof Contrato]);
    
    if (campos.length === 0) return null;

    const setClauses = campos.map((campo, index) => `${campo} = $${index + 2}`).join(', ');
    const query = `
      UPDATE contratos 
      SET ${setClauses}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, [id, ...valores]);
    return result.rows[0] || null;
  }

  async atualizarSaldo(id: number, novoSaldo: number): Promise<boolean> {
    const query = `
      UPDATE contratos 
      SET saldo_disponivel = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    const result = await this.pool.query(query, [novoSaldo, id]);
    return result.rowCount > 0;
  }

  async reservarSaldo(id: number, valor: number): Promise<boolean> {
    const query = `
      UPDATE contratos 
      SET saldo_disponivel = saldo_disponivel - $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND saldo_disponivel >= $1
    `;

    const result = await this.pool.query(query, [valor, id]);
    return result.rowCount > 0;
  }

  async liberarSaldo(id: number, valor: number): Promise<boolean> {
    const query = `
      UPDATE contratos 
      SET saldo_disponivel = saldo_disponivel + $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    const result = await this.pool.query(query, [valor, id]);
    return result.rowCount > 0;
  }

  async buscarContratosVencendo(dias: number = 30): Promise<Contrato[]> {
    const query = `
      SELECT c.*, f.nome as fornecedor_nome, f.cnpj as fornecedor_cnpj
      FROM contratos c
      JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE c.status = 'ativo'
        AND c.data_fim <= CURRENT_DATE + INTERVAL '${dias} days'
        AND c.data_fim > CURRENT_DATE
      ORDER BY c.data_fim ASC
    `;
    
    const result = await this.pool.query(query);
    return result.rows;
  }

  async buscarContratosVencidos(): Promise<Contrato[]> {
    const query = `
      SELECT c.*, f.nome as fornecedor_nome, f.cnpj as fornecedor_cnpj
      FROM contratos c
      JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE c.status = 'ativo' AND c.data_fim < CURRENT_DATE
      ORDER BY c.data_fim ASC
    `;
    
    const result = await this.pool.query(query);
    return result.rows;
  }

  async obterEstatisticas(): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'ativo') as ativos,
        COUNT(*) FILTER (WHERE status = 'inativo') as inativos,
        COUNT(*) FILTER (WHERE status = 'suspenso') as suspensos,
        COUNT(*) FILTER (WHERE status = 'finalizado') as finalizados,
        SUM(valor_total) FILTER (WHERE status = 'ativo') as valor_total_ativo,
        SUM(saldo_disponivel) FILTER (WHERE status = 'ativo') as saldo_total_disponivel,
        COUNT(*) FILTER (WHERE status = 'ativo' AND data_fim <= CURRENT_DATE + INTERVAL '30 days') as vencendo_30_dias
      FROM contratos
    `;
    
    const result = await this.pool.query(query);
    return result.rows[0];
  }

  async verificarDisponibilidade(id: number, valor: number): Promise<boolean> {
    const query = 'SELECT saldo_disponivel FROM contratos WHERE id = $1 AND status = \'ativo\'';
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) return false;
    
    return parseFloat(result.rows[0].saldo_disponivel) >= valor;
  }

  async buscarPorNumero(numero: string): Promise<Contrato | null> {
    const query = `
      SELECT c.*, f.nome as fornecedor_nome, f.cnpj as fornecedor_cnpj
      FROM contratos c
      JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE c.numero = $1
    `;
    
    const result = await this.pool.query(query, [numero]);
    return result.rows[0] || null;
  }
}