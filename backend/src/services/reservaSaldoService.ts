import { Pool } from 'pg';

export interface ReservaSaldo {
  id?: number;
  contrato_id: number;
  pedido_id?: number;
  valor_reservado: number;
  status: 'ativa' | 'consumida' | 'cancelada' | 'expirada';
  motivo: string;
  usuario_id: number;
  data_expiracao?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export class ReservaSaldoService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async criarReserva(reserva: Omit<ReservaSaldo, 'id' | 'created_at' | 'updated_at'>): Promise<ReservaSaldo | null> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Verificar se o contrato tem saldo disponível
      const contratoQuery = 'SELECT saldo_disponivel FROM contratos WHERE id = $1 AND status = \'ativo\'';
      const contratoResult = await client.query(contratoQuery, [reserva.contrato_id]);
      
      if (contratoResult.rows.length === 0) {
        throw new Error('Contrato não encontrado ou inativo');
      }

      const saldoDisponivel = parseFloat(contratoResult.rows[0].saldo_disponivel);
      
      if (saldoDisponivel < reserva.valor_reservado) {
        throw new Error('Saldo insuficiente no contrato');
      }

      // Criar a reserva
      const reservaQuery = `
        INSERT INTO reservas_saldo (contrato_id, pedido_id, valor_reservado, status, motivo, usuario_id, data_expiracao)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const reservaValues = [
        reserva.contrato_id,
        reserva.pedido_id,
        reserva.valor_reservado,
        reserva.status,
        reserva.motivo,
        reserva.usuario_id,
        reserva.data_expiracao
      ];

      const reservaResult = await client.query(reservaQuery, reservaValues);

      // Atualizar o saldo do contrato
      const updateSaldoQuery = `
        UPDATE contratos 
        SET saldo_disponivel = saldo_disponivel - $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;
      
      await client.query(updateSaldoQuery, [reserva.valor_reservado, reserva.contrato_id]);

      await client.query('COMMIT');
      return reservaResult.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async consumirReserva(reservaId: number, valorConsumido?: number): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Buscar a reserva
      const reservaQuery = 'SELECT * FROM reservas_saldo WHERE id = $1 AND status = \'ativa\'';
      const reservaResult = await client.query(reservaQuery, [reservaId]);
      
      if (reservaResult.rows.length === 0) {
        throw new Error('Reserva não encontrada ou já consumida');
      }

      const reserva = reservaResult.rows[0];
      const valorFinal = valorConsumido || reserva.valor_reservado;
      const valorSobra = reserva.valor_reservado - valorFinal;

      // Marcar reserva como consumida
      const updateReservaQuery = `
        UPDATE reservas_saldo 
        SET status = 'consumida', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      
      await client.query(updateReservaQuery, [reservaId]);

      // Se houve sobra, devolver ao contrato
      if (valorSobra > 0) {
        const updateSaldoQuery = `
          UPDATE contratos 
          SET saldo_disponivel = saldo_disponivel + $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `;
        
        await client.query(updateSaldoQuery, [valorSobra, reserva.contrato_id]);
      }

      await client.query('COMMIT');
      return true;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async cancelarReserva(reservaId: number, motivo?: string): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Buscar a reserva
      const reservaQuery = 'SELECT * FROM reservas_saldo WHERE id = $1 AND status = \'ativa\'';
      const reservaResult = await client.query(reservaQuery, [reservaId]);
      
      if (reservaResult.rows.length === 0) {
        throw new Error('Reserva não encontrada ou já processada');
      }

      const reserva = reservaResult.rows[0];

      // Marcar reserva como cancelada
      const updateReservaQuery = `
        UPDATE reservas_saldo 
        SET status = 'cancelada', motivo = COALESCE($1, motivo), updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;
      
      await client.query(updateReservaQuery, [motivo, reservaId]);

      // Devolver o valor ao contrato
      const updateSaldoQuery = `
        UPDATE contratos 
        SET saldo_disponivel = saldo_disponivel + $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;
      
      await client.query(updateSaldoQuery, [reserva.valor_reservado, reserva.contrato_id]);

      await client.query('COMMIT');
      return true;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listarReservas(filtros?: {
    contrato_id?: number;
    pedido_id?: number;
    status?: string;
    usuario_id?: number;
  }): Promise<ReservaSaldo[]> {
    let query = `
      SELECT rs.*, 
             c.numero as contrato_numero,
             f.nome as fornecedor_nome,
             u.nome as usuario_nome
      FROM reservas_saldo rs
      JOIN contratos c ON rs.contrato_id = c.id
      JOIN fornecedores f ON c.fornecedor_id = f.id
      JOIN usuarios u ON rs.usuario_id = u.id
      WHERE 1=1
    `;
    
    const values: any[] = [];
    let paramCount = 1;

    if (filtros?.contrato_id) {
      query += ` AND rs.contrato_id = $${paramCount}`;
      values.push(filtros.contrato_id);
      paramCount++;
    }

    if (filtros?.pedido_id) {
      query += ` AND rs.pedido_id = $${paramCount}`;
      values.push(filtros.pedido_id);
      paramCount++;
    }

    if (filtros?.status) {
      query += ` AND rs.status = $${paramCount}`;
      values.push(filtros.status);
      paramCount++;
    }

    if (filtros?.usuario_id) {
      query += ` AND rs.usuario_id = $${paramCount}`;
      values.push(filtros.usuario_id);
      paramCount++;
    }

    query += ' ORDER BY rs.created_at DESC';

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async buscarPorPedido(pedidoId: number): Promise<ReservaSaldo[]> {
    const query = `
      SELECT rs.*, 
             c.numero as contrato_numero,
             f.nome as fornecedor_nome
      FROM reservas_saldo rs
      JOIN contratos c ON rs.contrato_id = c.id
      JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE rs.pedido_id = $1
      ORDER BY rs.created_at DESC
    `;
    
    const result = await this.pool.query(query, [pedidoId]);
    return result.rows;
  }

  async verificarReservasExpiradas(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Buscar reservas expiradas
      const reservasExpiradas = await client.query(`
        SELECT * FROM reservas_saldo 
        WHERE status = 'ativa' 
          AND data_expiracao IS NOT NULL 
          AND data_expiracao < CURRENT_TIMESTAMP
      `);

      for (const reserva of reservasExpiradas.rows) {
        // Marcar como expirada
        await client.query(
          'UPDATE reservas_saldo SET status = \'expirada\', updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [reserva.id]
        );

        // Devolver saldo ao contrato
        await client.query(
          'UPDATE contratos SET saldo_disponivel = saldo_disponivel + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [reserva.valor_reservado, reserva.contrato_id]
        );
      }

      await client.query('COMMIT');
      
      if (reservasExpiradas.rows.length > 0) {
        console.log(`${reservasExpiradas.rows.length} reservas expiradas processadas`);
      }

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro ao processar reservas expiradas:', error);
    } finally {
      client.release();
    }
  }

  async obterEstatisticas(): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'ativa') as reservas_ativas,
        COUNT(*) FILTER (WHERE status = 'consumida') as reservas_consumidas,
        COUNT(*) FILTER (WHERE status = 'cancelada') as reservas_canceladas,
        COUNT(*) FILTER (WHERE status = 'expirada') as reservas_expiradas,
        COALESCE(SUM(valor_reservado) FILTER (WHERE status = 'ativa'), 0) as valor_total_reservado,
        COALESCE(SUM(valor_reservado) FILTER (WHERE status = 'consumida'), 0) as valor_total_consumido
      FROM reservas_saldo
      WHERE created_at > CURRENT_DATE - INTERVAL '30 days'
    `;
    
    const result = await this.pool.query(query);
    return result.rows[0];
  }

  async calcularSaldoReservado(contratoId: number): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(valor_reservado), 0) as total_reservado
      FROM reservas_saldo
      WHERE contrato_id = $1 AND status = 'ativa'
    `;
    
    const result = await this.pool.query(query, [contratoId]);
    return parseFloat(result.rows[0].total_reservado) || 0;
  }
}