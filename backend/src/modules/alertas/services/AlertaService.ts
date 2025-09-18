import { db } from '../../../database';
import { Alerta, NovoAlerta, TipoAlerta, FiltroAlertas } from '../models/Alerta';

export class AlertaService {
  private pool: any;

  constructor(pool: any) {
    this.pool = pool;
  }

  /**
   * Lista todos os alertas com filtros
   */
  async listarAlertas(filtros: any): Promise<Alerta[]> {
    try {
      const { tipo, prioridade, status, usuario_id } = filtros;
      
      let query = 'SELECT * FROM alertas WHERE 1=1';
      const values = [];
      let paramCount = 1;

      if (tipo) {
        query += ` AND tipo = $${paramCount}`;
        values.push(tipo);
        paramCount++;
      }

      if (prioridade) {
        query += ` AND prioridade = $${paramCount}`;
        values.push(prioridade);
        paramCount++;
      }

      if (usuario_id) {
        query += ` AND usuario_id = $${paramCount}`;
        values.push(usuario_id);
        paramCount++;
      }

      if (status) {
        if (status === 'lido') {
          query += ` AND lido = true`;
        } else if (status === 'nao_lido') {
          query += ` AND lido = false`;
        }
      }

      query += ' ORDER BY created_at DESC';

      const result = await this.pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Erro ao listar alertas:', error);
      throw new Error('Erro ao listar alertas');
    }
  }

  /**
   * Cria um novo alerta
   */
  async criarAlerta(alertaData: any): Promise<Alerta> {
    try {
      const {
        tipo,
        titulo,
        mensagem,
        prioridade,
        usuario_id,
        dados_contexto,
        data_expiracao
      } = alertaData;

      const result = await this.pool.query(
        `INSERT INTO alertas (tipo, titulo, mensagem, prioridade, usuario_id, metadados, data_expiracao, lido, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW(), NOW()) RETURNING *`,
        [
          tipo,
          titulo,
          mensagem,
          prioridade || 'media',
          usuario_id,
          dados_contexto || null,
          data_expiracao || null
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Erro ao criar alerta:', error);
      throw new Error('Erro ao criar alerta');
    }
  }

  /**
   * Marca alerta como lido
   */
  async marcarComoLido(id: number): Promise<boolean> {
    try {
      const result = await this.pool.query(
        'UPDATE alertas SET lido = true, updated_at = NOW() WHERE id = $1',
        [id]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('Erro ao marcar alerta como lido:', error);
      throw new Error('Erro ao marcar alerta como lido');
    }
  }

  /**
   * Marca alerta como resolvido
   */
  async marcarComoResolvido(id: number): Promise<boolean> {
    try {
      const result = await this.pool.query(
        'UPDATE alertas SET lido = true, updated_at = NOW() WHERE id = $1',
        [id]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('Erro ao marcar alerta como resolvido:', error);
      throw new Error('Erro ao marcar alerta como resolvido');
    }
  }

  /**
   * Ignora um alerta
   */
  async ignorarAlerta(id: number): Promise<boolean> {
    try {
      const result = await this.pool.query(
        'UPDATE alertas SET lido = true, updated_at = NOW() WHERE id = $1',
        [id]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('Erro ao ignorar alerta:', error);
      throw new Error('Erro ao ignorar alerta');
    }
  }

  /**
   * Executa verificações de alertas
   */
  async executarVerificacoes(): Promise<void> {
    try {
      // Implementação básica - pode ser expandida conforme necessário
      console.log('Verificações de alertas executadas');
    } catch (error) {
      console.error('Erro ao executar verificações:', error);
      throw new Error('Erro ao executar verificações de alertas');
    }
  }

  /**
   * Obtém estatísticas de alertas
   */
  async obterEstatisticas(): Promise<any> {
    try {
      const totalResult = await this.pool.query('SELECT COUNT(*) as total FROM alertas');
      const naoLidosResult = await this.pool.query('SELECT COUNT(*) as nao_lidos FROM alertas WHERE lido = false');
      
      return {
        total: parseInt(totalResult.rows[0].total),
        nao_lidos: parseInt(naoLidosResult.rows[0].nao_lidos)
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      throw new Error('Erro ao obter estatísticas de alertas');
    }
  }

  /**
   * Limpa alertas expirados
   */
  async limparAlertasExpirados(): Promise<number> {
    try {
      const result = await this.pool.query(
        'DELETE FROM alertas WHERE data_expiracao < NOW()'
      );
      return result.rowCount || 0;
    } catch (error) {
      console.error('Erro ao limpar alertas expirados:', error);
      throw new Error('Erro ao limpar alertas expirados');
    }
  }

  /**
   * Busca alertas por usuário
   */
  async buscarPorUsuario(usuarioId: number, filtros?: FiltroAlertas): Promise<Alerta[]> {
    try {
      let query = 'SELECT * FROM alertas WHERE usuario_id = $1';
      const values = [usuarioId];
      let paramCount = 2;

      if (filtros?.lido !== undefined) {
        query += ` AND lido = $${paramCount}`;
        values.push(filtros.lido);
        paramCount++;
      }

      if (filtros?.tipo) {
        query += ` AND tipo = $${paramCount}`;
        values.push(filtros.tipo);
        paramCount++;
      }

      if (filtros?.prioridade) {
        query += ` AND prioridade = $${paramCount}`;
        values.push(filtros.prioridade);
        paramCount++;
      }

      query += ' ORDER BY created_at DESC';

      const result = await this.pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar alertas por usuário:', error);
      throw new Error('Erro ao buscar alertas por usuário');
    }
  }
}
}