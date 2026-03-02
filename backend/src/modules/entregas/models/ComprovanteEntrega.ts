import db from '../../../database';

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
  created_at: string;
  updated_at: string;
}

export interface ComprovanteItemRecord {
  id: number;
  comprovante_id: number;
  historico_entrega_id: number;
  produto_nome: string;
  quantidade_entregue: number;
  unidade: string;
  lote?: string;
  created_at: string;
}

export interface CriarComprovanteData {
  escola_id: number;
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
    try {
      // Gerar número do comprovante
      const numeroResult = await db.query('SELECT gerar_numero_comprovante() as numero');
      const numeroComprovante = numeroResult.rows[0].numero;

      // Criar comprovante
      const comprovanteResult = await db.query(`
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
        await db.query(`
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

      return comprovante;
    } catch (error) {
      throw error;
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
  async listarPorEscola(escolaId: number, limit = 50, offset = 0): Promise<ComprovanteCompleto[]> {
    const result = await db.query(`
      SELECT * FROM vw_comprovantes_completos
      WHERE escola_id = $1
      ORDER BY data_entrega DESC
      LIMIT $2 OFFSET $3
    `, [escolaId, limit, offset]);

    return result.rows;
  }

  /**
   * Listar todos os comprovantes (com paginação)
   */
  async listar(limit = 50, offset = 0): Promise<ComprovanteCompleto[]> {
    const result = await db.query(`
      SELECT * FROM vw_comprovantes_completos
      ORDER BY data_entrega DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return result.rows;
  }

  /**
   * Cancelar um comprovante
   */
  async cancelar(id: number): Promise<void> {
    await db.query(`
      UPDATE comprovantes_entrega
      SET status = 'cancelado', updated_at = NOW()
      WHERE id = $1
    `, [id]);
  }

  /**
   * Contar comprovantes por escola
   */
  async contarPorEscola(escolaId: number): Promise<number> {
    const result = await db.query(`
      SELECT COUNT(*) as total
      FROM comprovantes_entrega
      WHERE escola_id = $1
    `, [escolaId]);

    return parseInt(result.rows[0].total);
  }
}

export default new ComprovanteEntregaModel();
