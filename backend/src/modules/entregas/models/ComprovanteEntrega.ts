import db from '../../../database';
import HistoricoEntregaModel from './HistoricoEntrega';

export interface ComprovanteEntregaRecord {
  id: number;
  numero_comprovante: string;
  escola_id: number;
  data_entrega: string;
  nome_quem_entregou: string;
  nome_quem_recebeu: string;
  cargo_recebedor?: string;
  observacao?: string;
  assinatura_base64?: string;
  latitude?: number;
  longitude?: number;
  precisao_gps?: number;
  total_itens: number;
  status: string;
  itens_cancelados?: number;
  observacao_cancelamento?: string;
  created_at: string;
  updated_at: string;
}

export interface ComprovanteItemRecord {
  id: number;
  comprovante_id: number;
  historico_entrega_id: number | null;
  produto_nome: string;
  quantidade_entregue: number;
  unidade: string;
  lote?: string;
  guia_demanda_id?: number;
  mes_referencia?: number;
  ano_referencia?: number;
  data_entrega_original?: string;
  created_at: string;
}

export interface CriarComprovanteData {
  escola_id: number;
  periodo_id?: number;
  nome_quem_entregou: string;
  nome_quem_recebeu: string;
  cargo_recebedor?: string;
  observacao?: string;
  assinatura_base64?: string;
  latitude?: number;
  longitude?: number;
  precisao_gps?: number;
  itens: Array<{
    historico_entrega_id: number;
    produto_nome: string;
    quantidade_entregue: number;
    unidade: string;
    lote?: string;
  }>;
}

export interface ComprovanteCompleto extends ComprovanteEntregaRecord {
  escola_nome: string;
  escola_endereco?: string;
  itens: ComprovanteItemRecord[];
}

class ComprovanteEntregaModel {
  /**
   * Criar um novo comprovante de entrega com seus itens
   */
  async criar(dados: CriarComprovanteData): Promise<ComprovanteEntregaRecord> {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const historicoIds = dados.itens.map((item) => Number(item.historico_entrega_id));
      const periodoResult = await client.query(`
        SELECT COUNT(DISTINCT g.periodo_id)::int as total_periodos,
               BOOL_OR(COALESCE(per.fechado, false)) as periodo_fechado,
               MIN(g.periodo_id) as periodo_id
        FROM historico_entregas he
        JOIN guia_produto_escola gpe ON gpe.id = he.guia_produto_escola_id
        JOIN guias g ON g.id = gpe.guia_id
        LEFT JOIN periodos per ON per.id = g.periodo_id
        WHERE he.id = ANY($1::int[])
      `, [historicoIds]);

      const periodoInfo = periodoResult.rows[0];
      if (Number(periodoInfo?.total_periodos || 0) !== 1) {
        throw new Error('Itens do comprovante devem pertencer a um unico periodo');
      }
      if (dados.periodo_id && Number(periodoInfo.periodo_id) !== Number(dados.periodo_id)) {
        throw new Error('Itens do comprovante pertencem a outro periodo');
      }
      if (periodoInfo?.periodo_fechado) {
        throw new Error('Nao e possivel criar comprovante em periodo fechado');
      }

      // Gerar número do comprovante
      const numeroResult = await client.query('SELECT gerar_numero_comprovante() as numero');
      const numeroComprovante = numeroResult.rows[0].numero;

      // Criar comprovante
      const comprovanteResult = await client.query(`
        INSERT INTO comprovantes_entrega (
          numero_comprovante,
          escola_id,
          nome_quem_entregou,
          nome_quem_recebeu,
          cargo_recebedor,
          observacao,
          assinatura_base64,
          latitude,
          longitude,
          precisao_gps,
          total_itens
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        numeroComprovante,
        dados.escola_id,
        dados.nome_quem_entregou,
        dados.nome_quem_recebeu,
        dados.cargo_recebedor,
        dados.observacao,
        dados.assinatura_base64,
        dados.latitude,
        dados.longitude,
        dados.precisao_gps,
        dados.itens.length
      ]);

      const comprovante = comprovanteResult.rows[0];

      // Inserir itens do comprovante
      for (const item of dados.itens) {
        await client.query(`
          INSERT INTO comprovante_itens (
            comprovante_id,
            historico_entrega_id,
            produto_nome,
            quantidade_entregue,
            unidade,
            lote
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          comprovante.id,
          item.historico_entrega_id,
          item.produto_nome,
          item.quantidade_entregue,
          item.unidade,
          item.lote
        ]);
      }

      await client.query('COMMIT');
      return comprovante;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Buscar comprovante por ID com todos os detalhes
   */
  async buscarPorId(id: number): Promise<ComprovanteCompleto | null> {
    const result = await db.query(`
      SELECT * FROM vw_comprovantes_completos
      WHERE id = $1
    `, [id]);

    return result.rows[0] || null;
  }

  /**
   * Buscar comprovante por número
   */
  async buscarPorNumero(numero: string): Promise<ComprovanteCompleto | null> {
    const result = await db.query(`
      SELECT * FROM vw_comprovantes_completos
      WHERE numero_comprovante = $1
    `, [numero]);

    return result.rows[0] || null;
  }

  /**
   * Listar comprovantes de uma escola
   */
  async listarPorEscola(escolaId: number, limit = 50, offset = 0, periodoId?: number): Promise<ComprovanteCompleto[]> {
    const params: any[] = [escolaId, limit, offset];
    const periodoFilter = periodoId ? `AND EXISTS (
        SELECT 1
        FROM comprovante_itens ci
        JOIN historico_entregas he ON he.id = ci.historico_entrega_id
        JOIN guia_produto_escola gpe ON gpe.id = he.guia_produto_escola_id
        JOIN guias g ON g.id = gpe.guia_id
        WHERE ci.comprovante_id = vw_comprovantes_completos.id
          AND g.periodo_id = $4
      )` : '';
    if (periodoId) params.push(periodoId);

    const result = await db.query(`
      SELECT * FROM vw_comprovantes_completos
      WHERE escola_id = $1
      ${periodoFilter}
      ORDER BY data_entrega DESC
      LIMIT $2 OFFSET $3
    `, params);

    return result.rows;
  }

  /**
   * Listar todos os comprovantes (com paginação e filtro de data)
   */
  async listar(limit = 50, offset = 0, dataInicio?: string, dataFim?: string, periodoId?: number): Promise<ComprovanteCompleto[]> {
    let query = `
      SELECT * FROM vw_comprovantes_completos
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (dataInicio) {
      // Usar DATE() para comparar apenas a parte da data, ignorando timezone
      query += ` AND DATE(data_entrega) >= $${paramIndex}`;
      params.push(dataInicio);
      paramIndex++;
    }

    if (dataFim) {
      // Usar DATE() para comparar apenas a parte da data, ignorando timezone
      query += ` AND DATE(data_entrega) <= $${paramIndex}`;
      params.push(dataFim);
      paramIndex++;
    }

    if (periodoId) {
      query += ` AND EXISTS (
        SELECT 1
        FROM comprovante_itens ci
        JOIN historico_entregas he ON he.id = ci.historico_entrega_id
        JOIN guia_produto_escola gpe ON gpe.id = he.guia_produto_escola_id
        JOIN guias g ON g.id = gpe.guia_id
        WHERE ci.comprovante_id = vw_comprovantes_completos.id
          AND g.periodo_id = $${paramIndex}
      )`;
      params.push(periodoId);
      paramIndex++;
    }

    query += ` ORDER BY data_entrega DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);


    const result = await db.query(query, params);


    return result.rows;
  }

  /**
   * Cancelar um comprovante
   */
  async cancelar(id: number): Promise<void> {
    return db.transaction(async (client) => {
      const periodo = await client.query(`
        SELECT COALESCE(per.fechado, false) as fechado
        FROM comprovante_itens ci
        JOIN historico_entregas he ON he.id = ci.historico_entrega_id
        JOIN guia_produto_escola gpe ON gpe.id = he.guia_produto_escola_id
        JOIN guias g ON g.id = gpe.guia_id
        LEFT JOIN periodos per ON per.id = g.periodo_id
        WHERE ci.comprovante_id = $1
        FOR UPDATE OF ci, he, gpe
      `, [id]);
      if (periodo.rows.some((row: any) => row.fechado)) {
        throw new Error('Nao e possivel cancelar comprovante de periodo fechado');
      }

      await client.query(`
        UPDATE comprovantes_entrega
        SET status = 'cancelado', updated_at = NOW()
        WHERE id = $1
      `, [id]);
    });
  }

  /**
   * Excluir permanentemente um comprovante e seus itens
   */
  async excluir(id: number): Promise<void> {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const periodo = await client.query(`
        SELECT BOOL_OR(COALESCE(per.fechado, false)) as fechado
        FROM comprovante_itens ci
        JOIN historico_entregas he ON he.id = ci.historico_entrega_id
        JOIN guia_produto_escola gpe ON gpe.id = he.guia_produto_escola_id
        JOIN guias g ON g.id = gpe.guia_id
        LEFT JOIN periodos per ON per.id = g.periodo_id
        WHERE ci.comprovante_id = $1
      `, [id]);
      if (periodo.rows[0]?.fechado) {
        throw new Error('Nao e possivel excluir comprovante de periodo fechado');
      }
      
      // Excluir os itens do comprovante
      await client.query(`
        DELETE FROM comprovante_itens
        WHERE comprovante_id = $1
      `, [id]);

      // Excluir registros de cancelamento (se existirem)
      await client.query(`
        DELETE FROM comprovante_cancelamentos
        WHERE comprovante_id = $1
      `, [id]);

      // Excluir o comprovante
      await client.query(`
        DELETE FROM comprovantes_entrega
        WHERE id = $1
      `, [id]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Contar comprovantes por escola
   */
  async contarPorEscola(escolaId: number, periodoId?: number): Promise<number> {
    const params: any[] = [escolaId];
    const periodoFilter = periodoId ? `AND EXISTS (
        SELECT 1
        FROM comprovante_itens ci
        JOIN historico_entregas he ON he.id = ci.historico_entrega_id
        JOIN guia_produto_escola gpe ON gpe.id = he.guia_produto_escola_id
        JOIN guias g ON g.id = gpe.guia_id
        WHERE ci.comprovante_id = ce.id
          AND g.periodo_id = $2
      )` : '';
    if (periodoId) params.push(periodoId);

    const result = await db.query(`
      SELECT COUNT(*) as total
      FROM comprovantes_entrega ce
      WHERE escola_id = $1
      ${periodoFilter}
    `, params);

    return parseInt(result.rows[0].total);
  }

  /**
   * Cancelar item de entrega de forma segura (mantém integridade do comprovante)
   */
  async cancelarItemEntrega(historicoEntregaId: number, motivo?: string, usuarioId?: number): Promise<boolean> {
    try {
      await db.transaction(async (client) => {
        const item = await client.query(`
          SELECT
            ci.id as item_id,
            ci.comprovante_id,
            he.guia_produto_escola_id,
            json_build_object(
              'historico_id', he.id,
              'quantidade', he.quantidade_entregue,
              'produto', ci.produto_nome,
              'data', he.data_entrega
            ) as dados_originais,
            COALESCE(per.fechado, false) as periodo_fechado
          FROM comprovante_itens ci
          JOIN historico_entregas he ON he.id = ci.historico_entrega_id
          JOIN guia_produto_escola gpe ON gpe.id = he.guia_produto_escola_id
          JOIN guias g ON g.id = gpe.guia_id
          LEFT JOIN periodos per ON per.id = g.periodo_id
          WHERE ci.historico_entrega_id = $1
          FOR UPDATE OF ci, he, gpe
        `, [historicoEntregaId]);

        if (item.rows.length === 0) {
          throw new Error('Item de entrega nao encontrado');
        }
        if (item.rows[0].periodo_fechado) {
          throw new Error('Nao e possivel cancelar item de periodo fechado');
        }

        const { comprovante_id, dados_originais } = item.rows[0];

        await client.query(`
          INSERT INTO comprovante_cancelamentos
            (comprovante_id, historico_entrega_id, usuario_id, motivo, dados_originais)
          VALUES ($1, $2, $3, $4, $5)
        `, [comprovante_id, historicoEntregaId, usuarioId || null, motivo || null, dados_originais]);

        await client.query(`
          UPDATE comprovantes_entrega
          SET itens_cancelados = COALESCE(itens_cancelados, 0) + 1,
              observacao_cancelamento = COALESCE(observacao_cancelamento || E'\n', '') ||
                'Item cancelado em ' || CURRENT_DATE ||
                COALESCE(': ' || $2, ''),
              updated_at = NOW()
          WHERE id = $1
        `, [comprovante_id, motivo || null]);

        await HistoricoEntregaModel.deletar(historicoEntregaId, client);
      });
      return true;
    } catch (error) {
      console.error('Erro ao cancelar item de entrega:', error);
      throw error;
    }
  }

  /**
   * Buscar histórico de cancelamentos de um comprovante
   */
  async buscarCancelamentos(comprovanteId: number): Promise<any[]> {
    const result = await db.query(`
      SELECT 
        cc.*,
        u.nome as usuario_nome
      FROM comprovante_cancelamentos cc
      LEFT JOIN usuarios u ON cc.usuario_id = u.id
      WHERE cc.comprovante_id = $1
      ORDER BY cc.data_cancelamento DESC
    `, [comprovanteId]);

    return result.rows;
  }
}

export default new ComprovanteEntregaModel();
