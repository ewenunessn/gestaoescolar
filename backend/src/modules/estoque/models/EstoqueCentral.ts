import db from '../../../database';

export interface EstoqueCentralRecord {
  id: number;
  produto_id: number;
  quantidade: number;
  quantidade_reservada: number;
  quantidade_disponivel: number;
  created_at: string;
  updated_at: string;
}

export interface EstoqueCentralLoteRecord {
  id: number;
  estoque_central_id: number;
  lote: string;
  data_fabricacao?: string;
  data_validade: string;
  quantidade: number;
  quantidade_reservada: number;
  quantidade_disponivel: number;
  observacao?: string;
  created_at: string;
  updated_at: string;
}

export interface MovimentacaoRecord {
  id: number;
  estoque_central_id: number;
  lote_id?: number;
  tipo: 'entrada' | 'saida' | 'ajuste';
  quantidade: number;
  quantidade_anterior: number;
  quantidade_posterior: number;
  motivo?: string;
  observacao?: string;
  documento?: string;
  fornecedor?: string;
  nota_fiscal?: string;
  usuario_id?: number;
  usuario_nome?: string;
  created_at: string;
}

export interface EstoqueCentralCompleto extends EstoqueCentralRecord {
  produto_nome: string;
  unidade: string;
  categoria?: string;
  total_lotes: number;
  proxima_validade?: string;
}

export interface CriarEntradaData {
  produto_id: number;
  quantidade: number;
  lote?: string;
  data_fabricacao?: string;
  data_validade?: string;
  motivo?: string;
  observacao?: string;
  documento?: string;
  fornecedor?: string;
  nota_fiscal?: string;
  usuario_id?: number;
  usuario_nome?: string;
}

export interface CriarSaidaData {
  produto_id: number;
  quantidade: number;
  lote_id?: number;
  motivo?: string;
  observacao?: string;
  documento?: string;
  usuario_id?: number;
  usuario_nome?: string;
}

export interface CriarAjusteData {
  produto_id: number;
  quantidade_nova: number;
  lote_id?: number;
  motivo: string;
  observacao?: string;
  usuario_id?: number;
  usuario_nome?: string;
}

class EstoqueCentralModel {
  /**
   * Buscar ou criar registro de estoque para um produto
   */
  async buscarOuCriarEstoque(produtoId: number): Promise<EstoqueCentralRecord> {
    let result = await db.query(
      'SELECT * FROM estoque_central WHERE produto_id = $1',
      [produtoId]
    );

    if (result.rows.length === 0) {
      result = await db.query(
        'INSERT INTO estoque_central (produto_id, quantidade) VALUES ($1, 0) RETURNING *',
        [produtoId]
      );
    }

    return result.rows[0];
  }

  /**
   * Registrar entrada de estoque
   */
  async registrarEntrada(dados: CriarEntradaData): Promise<MovimentacaoRecord> {
    return await db.transaction(async (client) => {
      // Buscar ou criar estoque
      const estoqueResult = await client.query(
        'SELECT * FROM estoque_central WHERE produto_id = $1',
        [dados.produto_id]
      );

      let estoque: EstoqueCentralRecord;
      if (estoqueResult.rows.length === 0) {
        const novoEstoque = await client.query(
          'INSERT INTO estoque_central (produto_id, quantidade) VALUES ($1, 0) RETURNING *',
          [dados.produto_id]
        );
        estoque = novoEstoque.rows[0];
      } else {
        estoque = estoqueResult.rows[0];
      }

      const quantidadeAnterior = estoque.quantidade;
      const quantidadePosterior = quantidadeAnterior + dados.quantidade;

      // Atualizar quantidade no estoque
      await client.query(
        'UPDATE estoque_central SET quantidade = $1 WHERE id = $2',
        [quantidadePosterior, estoque.id]
      );

      // Se tem lote e validade, criar/atualizar lote
      let loteId: number | null = null;
      if (dados.lote && dados.data_validade) {
        const loteResult = await client.query(
          `INSERT INTO estoque_central_lotes 
           (estoque_central_id, lote, data_fabricacao, data_validade, quantidade, observacao)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (estoque_central_id, lote) 
           DO UPDATE SET 
             quantidade = estoque_central_lotes.quantidade + EXCLUDED.quantidade,
             data_validade = EXCLUDED.data_validade,
             observacao = EXCLUDED.observacao
           RETURNING id`,
          [estoque.id, dados.lote, dados.data_fabricacao, dados.data_validade, dados.quantidade, dados.observacao]
        );
        loteId = loteResult.rows[0].id;
      }

      // Registrar movimentação
      const movimentacaoResult = await client.query(
        `INSERT INTO estoque_central_movimentacoes 
         (estoque_central_id, lote_id, tipo, quantidade, quantidade_anterior, quantidade_posterior, 
          motivo, observacao, documento, fornecedor, nota_fiscal, usuario_id, usuario_nome)
         VALUES ($1, $2, 'entrada', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          estoque.id, loteId, dados.quantidade, quantidadeAnterior, quantidadePosterior,
          dados.motivo, dados.observacao, dados.documento, dados.fornecedor, dados.nota_fiscal,
          dados.usuario_id, dados.usuario_nome
        ]
      );

      return movimentacaoResult.rows[0];
    });
  }

  /**
   * Registrar saída de estoque
   */
  async registrarSaida(dados: CriarSaidaData): Promise<MovimentacaoRecord> {
    return await db.transaction(async (client) => {
      // Buscar estoque
      const estoqueResult = await client.query(
        'SELECT * FROM estoque_central WHERE produto_id = $1',
        [dados.produto_id]
      );

      if (estoqueResult.rows.length === 0) {
        throw new Error('Produto não encontrado no estoque central');
      }

      const estoque: EstoqueCentralRecord = estoqueResult.rows[0];

      if (estoque.quantidade_disponivel < dados.quantidade) {
        throw new Error(`Quantidade insuficiente. Disponível: ${estoque.quantidade_disponivel}`);
      }

      const quantidadeAnterior = estoque.quantidade;
      const quantidadePosterior = quantidadeAnterior - dados.quantidade;

      // Atualizar quantidade no estoque
      await client.query(
        'UPDATE estoque_central SET quantidade = $1 WHERE id = $2',
        [quantidadePosterior, estoque.id]
      );

      // Se tem lote específico, atualizar lote
      if (dados.lote_id) {
        const loteResult = await client.query(
          'SELECT * FROM estoque_central_lotes WHERE id = $1',
          [dados.lote_id]
        );

        if (loteResult.rows.length === 0) {
          throw new Error('Lote não encontrado');
        }

        const lote = loteResult.rows[0];
        if (lote.quantidade_disponivel < dados.quantidade) {
          throw new Error(`Quantidade insuficiente no lote. Disponível: ${lote.quantidade_disponivel}`);
        }

        await client.query(
          'UPDATE estoque_central_lotes SET quantidade = quantidade - $1 WHERE id = $2',
          [dados.quantidade, dados.lote_id]
        );
      }

      // Registrar movimentação
      const movimentacaoResult = await client.query(
        `INSERT INTO estoque_central_movimentacoes 
         (estoque_central_id, lote_id, tipo, quantidade, quantidade_anterior, quantidade_posterior, 
          motivo, observacao, documento, usuario_id, usuario_nome)
         VALUES ($1, $2, 'saida', $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          estoque.id, dados.lote_id, -dados.quantidade, quantidadeAnterior, quantidadePosterior,
          dados.motivo, dados.observacao, dados.documento, dados.usuario_id, dados.usuario_nome
        ]
      );

      return movimentacaoResult.rows[0];
    });
  }

  /**
   * Registrar ajuste de estoque
   */
  async registrarAjuste(dados: CriarAjusteData): Promise<MovimentacaoRecord> {
    return await db.transaction(async (client) => {
      // Buscar estoque
      const estoqueResult = await client.query(
        'SELECT * FROM estoque_central WHERE produto_id = $1',
        [dados.produto_id]
      );

      if (estoqueResult.rows.length === 0) {
        throw new Error('Produto não encontrado no estoque central');
      }

      const estoque: EstoqueCentralRecord = estoqueResult.rows[0];
      const quantidadeAnterior = estoque.quantidade;
      const quantidadePosterior = dados.quantidade_nova;
      const diferencaQuantidade = quantidadePosterior - quantidadeAnterior;

      // Atualizar quantidade no estoque
      await client.query(
        'UPDATE estoque_central SET quantidade = $1 WHERE id = $2',
        [quantidadePosterior, estoque.id]
      );

      // Se tem lote específico, ajustar lote
      if (dados.lote_id) {
        const loteResult = await client.query(
          'SELECT * FROM estoque_central_lotes WHERE id = $1',
          [dados.lote_id]
        );

        if (loteResult.rows.length === 0) {
          throw new Error('Lote não encontrado');
        }

        const lote = loteResult.rows[0];
        const novaQuantidadeLote = lote.quantidade + diferencaQuantidade;

        if (novaQuantidadeLote < 0) {
          throw new Error('Ajuste resultaria em quantidade negativa no lote');
        }

        await client.query(
          'UPDATE estoque_central_lotes SET quantidade = $1 WHERE id = $2',
          [novaQuantidadeLote, dados.lote_id]
        );
      }

      // Registrar movimentação
      const movimentacaoResult = await client.query(
        `INSERT INTO estoque_central_movimentacoes 
         (estoque_central_id, lote_id, tipo, quantidade, quantidade_anterior, quantidade_posterior, 
          motivo, observacao, usuario_id, usuario_nome)
         VALUES ($1, $2, 'ajuste', $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          estoque.id, dados.lote_id, diferencaQuantidade, quantidadeAnterior, quantidadePosterior,
          dados.motivo, dados.observacao, dados.usuario_id, dados.usuario_nome
        ]
      );

      return movimentacaoResult.rows[0];
    });
  }

  /**
   * Listar estoque completo
   */
  async listar(limit = 100, offset = 0): Promise<EstoqueCentralCompleto[]> {
    const result = await db.query(
      `SELECT * FROM vw_estoque_central_completo 
       ORDER BY produto_nome 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  /**
   * Buscar estoque por produto
   */
  async buscarPorProduto(produtoId: number): Promise<EstoqueCentralCompleto | null> {
    const result = await db.query(
      'SELECT * FROM vw_estoque_central_completo WHERE produto_id = $1',
      [produtoId]
    );
    return result.rows[0] || null;
  }

  /**
   * Listar lotes de um produto
   */
  async listarLotes(estoqueId: number): Promise<EstoqueCentralLoteRecord[]> {
    const result = await db.query(
      `SELECT * FROM estoque_central_lotes 
       WHERE estoque_central_id = $1 AND quantidade > 0
       ORDER BY data_validade ASC`,
      [estoqueId]
    );
    return result.rows;
  }

  /**
   * Listar lotes próximos do vencimento
   */
  async listarLotesProximosVencimento(dias = 30): Promise<any[]> {
    const result = await db.query(
      `SELECT * FROM vw_lotes_proximos_vencimento 
       WHERE dias_para_vencer <= $1
       ORDER BY dias_para_vencer ASC`,
      [dias]
    );
    return result.rows;
  }

  /**
   * Listar produtos com estoque baixo
   */
  async listarEstoqueBaixo(): Promise<any[]> {
    const result = await db.query('SELECT * FROM vw_estoque_baixo');
    return result.rows;
  }

  /**
   * Listar movimentações
   */
  async listarMovimentacoes(
    estoqueId?: number,
    tipo?: string,
    dataInicio?: string,
    dataFim?: string,
    limit = 100,
    offset = 0
  ): Promise<MovimentacaoRecord[]> {
    let query = `
      SELECT m.*, p.nome as produto_nome, p.unidade
      FROM estoque_central_movimentacoes m
      INNER JOIN estoque_central ec ON ec.id = m.estoque_central_id
      INNER JOIN produtos p ON p.id = ec.produto_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (estoqueId) {
      query += ` AND m.estoque_central_id = $${paramIndex}`;
      params.push(estoqueId);
      paramIndex++;
    }

    if (tipo) {
      query += ` AND m.tipo = $${paramIndex}`;
      params.push(tipo);
      paramIndex++;
    }

    if (dataInicio) {
      query += ` AND DATE(m.created_at) >= $${paramIndex}`;
      params.push(dataInicio);
      paramIndex++;
    }

    if (dataFim) {
      query += ` AND DATE(m.created_at) <= $${paramIndex}`;
      params.push(dataFim);
      paramIndex++;
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }
}

export default new EstoqueCentralModel();
