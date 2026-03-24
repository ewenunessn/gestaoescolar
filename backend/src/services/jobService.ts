import db from '../database';

export interface Job {
  id: number;
  tipo: string;
  status: 'pendente' | 'processando' | 'concluido' | 'erro';
  progresso: number;
  total_itens: number;
  itens_processados: number;
  tempo_estimado?: number;
  tempo_inicio?: Date;
  tempo_fim?: Date;
  resultado?: any;
  erro?: string;
  parametros?: any;
  usuario_id?: number;
  created_at: Date;
  updated_at: Date;
}

export class JobService {
  /**
   * Cria um novo job
   */
  static async criarJob(
    tipo: string,
    parametros: any,
    usuario_id?: number,
    total_itens: number = 0
  ): Promise<Job> {
    const result = await db.pool.query(
      `INSERT INTO jobs (tipo, status, parametros, usuario_id, total_itens, created_at, updated_at)
       VALUES ($1, 'pendente', $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [tipo, JSON.stringify(parametros), usuario_id, total_itens]
    );
    return result.rows[0];
  }

  /**
   * Atualiza o status do job
   */
  static async atualizarStatus(
    jobId: number,
    status: 'pendente' | 'processando' | 'concluido' | 'erro',
    dados?: {
      progresso?: number;
      itens_processados?: number;
      tempo_estimado?: number;
      resultado?: any;
      erro?: string;
    }
  ): Promise<void> {
    const campos: string[] = ['status = $1', 'updated_at = NOW()'];
    const valores: any[] = [status];
    let paramIndex = 2;

    if (status === 'processando' && dados?.progresso === 0) {
      campos.push(`tempo_inicio = NOW()`);
    }

    if (status === 'concluido' || status === 'erro') {
      campos.push(`tempo_fim = NOW()`);
    }

    if (dados?.progresso !== undefined) {
      campos.push(`progresso = $${paramIndex++}`);
      valores.push(dados.progresso);
    }

    if (dados?.itens_processados !== undefined) {
      campos.push(`itens_processados = $${paramIndex++}`);
      valores.push(dados.itens_processados);
    }

    if (dados?.tempo_estimado !== undefined) {
      campos.push(`tempo_estimado = $${paramIndex++}`);
      valores.push(dados.tempo_estimado);
    }

    if (dados?.resultado !== undefined) {
      campos.push(`resultado = $${paramIndex++}`);
      valores.push(JSON.stringify(dados.resultado));
    }

    if (dados?.erro !== undefined) {
      campos.push(`erro = $${paramIndex++}`);
      valores.push(dados.erro);
    }

    valores.push(jobId);

    await db.pool.query(
      `UPDATE jobs SET ${campos.join(', ')} WHERE id = $${paramIndex}`,
      valores
    );
  }

  /**
   * Busca um job por ID
   */
  static async buscarJob(jobId: number): Promise<Job | null> {
    const result = await db.pool.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
    return result.rows[0] || null;
  }

  /**
   * Lista jobs recentes do usuário
   */
  static async listarJobsUsuario(usuario_id: number, limite: number = 20): Promise<Job[]> {
    const result = await db.pool.query(
      `SELECT * FROM jobs 
       WHERE usuario_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [usuario_id, limite]
    );
    return result.rows;
  }

  /**
   * Lista jobs em processamento
   */
  static async listarJobsProcessando(): Promise<Job[]> {
    const result = await db.pool.query(
      `SELECT * FROM jobs 
       WHERE status IN ('pendente', 'processando') 
       ORDER BY created_at ASC`
    );
    return result.rows;
  }

  /**
   * Calcula tempo estimado baseado no progresso
   */
  static calcularTempoEstimado(
    tempo_inicio: Date,
    itens_processados: number,
    total_itens: number
  ): number {
    if (itens_processados === 0) return 0;

    const tempoDecorrido = (Date.now() - tempo_inicio.getTime()) / 1000; // segundos
    const tempoMedioPorItem = tempoDecorrido / itens_processados;
    const itensRestantes = total_itens - itens_processados;
    return Math.ceil(itensRestantes * tempoMedioPorItem);
  }
}
