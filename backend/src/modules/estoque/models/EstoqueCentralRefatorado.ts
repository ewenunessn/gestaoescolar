import db from '../../../database';

// Interfaces permanecem as mesmas, mas CriarEntradaData agora exige lote
export interface CriarEntradaData {
  produto_id: number;
  quantidade: number;
  lote: string; // OBRIGATÓRIO
  data_fabricacao?: string;
  data_validade: string; // OBRIGATÓRIO
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
  motivo?: string;
  observacao?: string;
  documento?: string;
  usuario_id?: number;
  usuario_nome?: string;
  // lote_id removido - será calculado automaticamente via FEFO
}

class EstoqueCentralModel {
  /**
   * Registrar entrada de estoque (SEMPRE com lote)
   */
  async registrarEntrada(dados: CriarEntradaData): Promise<any> {
    return await db.transaction(async (client) => {
      // Buscar ou criar estoque
      const estoqueResult = await client.query(
        'SELECT * FROM estoque_central WHERE produto_id = $1',
        [dados.produto_id]
      );

      let estoqueId: number;
      if (estoqueResult.rows.length === 0) {
        const novoEstoque = await client.query(
          'INSERT INTO estoque_central (produto_id) VALUES ($1) RETURNING id',
          [dados.produto_id]
        );
        estoqueId = novoEstoque.rows[0].id;
      } else {
        estoqueId = estoqueResult.rows[0].id;
      }

      const quantidadeNum = parseFloat(dados.quantidade as any) || 0;

      // Criar ou atualizar lote
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
        [estoqueId, dados.lote, dados.data_fabricacao, dados.data_validade, quantidadeNum, dados.observacao]
      );

      const loteId = loteResult.rows[0].id;

      // Registrar movimentação
      const movimentacaoResult = await client.query(
        `INSERT INTO estoque_central_movimentacoes 
         (estoque_central_id, lote_id, tipo, quantidade, quantidade_anterior, quantidade_posterior, 
          motivo, observacao, documento, fornecedor, nota_fiscal, usuario_id, usuario_nome)
         VALUES ($1, $2, 'entrada', $3, 0, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          estoqueId, loteId, quantidadeNum,
          dados.motivo, dados.observacao, dados.documento, dados.fornecedor, dados.nota_fiscal,
          dados.usuario_id, dados.usuario_nome
        ]
      );

      return movimentacaoResult.rows[0];
    });
  }

  /**
   * Registrar saída de estoque usando FEFO (First Expired, First Out)
   */
  async registrarSaida(dados: CriarSaidaData): Promise<any> {
    return await db.transaction(async (client) => {
      // Buscar estoque
      const estoqueResult = await client.query(
        'SELECT * FROM estoque_central WHERE produto_id = $1',
        [dados.produto_id]
      );

      if (estoqueResult.rows.length === 0) {
        throw new Error('Produto não encontrado no estoque central');
      }

      const estoqueId = estoqueResult.rows[0].id;
      let quantidadeRestante = parseFloat(dados.quantidade as any) || 0;

      // Buscar lotes disponíveis ordenados por FEFO
      const lotesResult = await client.query(
        `SELECT id, lote, data_validade, quantidade_disponivel
         FROM estoque_central_lotes
         WHERE estoque_central_id = $1 AND quantidade_disponivel > 0
         ORDER BY data_validade ASC, created_at ASC`,
        [estoqueId]
      );

      if (lotesResult.rows.length === 0) {
        throw new Error('Não há lotes disponíveis para este produto');
      }

      // Calcular quantidade total disponível
      const totalDisponivel = lotesResult.rows.reduce((sum, lote) => 
        sum + parseFloat(lote.quantidade_disponivel), 0
      );

      if (totalDisponivel < quantidadeRestante) {
        throw new Error(`Quantidade insuficiente. Disponível: ${totalDisponivel}`);
      }

      const movimentacoes = [];

      // Processar saída usando FEFO
      for (const lote of lotesResult.rows) {
        if (quantidadeRestante <= 0) break;

        const quantidadeLote = parseFloat(lote.quantidade_disponivel);
        const quantidadeRetirar = Math.min(quantidadeRestante, quantidadeLote);

        // Atualizar quantidade do lote
        await client.query(
          'UPDATE estoque_central_lotes SET quantidade = quantidade - $1 WHERE id = $2',
          [quantidadeRetirar, lote.id]
        );

        // Registrar movimentação
        const movResult = await client.query(
          `INSERT INTO estoque_central_movimentacoes 
           (estoque_central_id, lote_id, tipo, quantidade, quantidade_anterior, quantidade_posterior, 
            motivo, observacao, documento, usuario_id, usuario_nome)
           VALUES ($1, $2, 'saida', $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [
            estoqueId, lote.id, -quantidadeRetirar, quantidadeLote, quantidadeLote - quantidadeRetirar,
            dados.motivo, dados.observacao, dados.documento, dados.usuario_id, dados.usuario_nome
          ]
        );

        movimentacoes.push(movResult.rows[0]);
        quantidadeRestante -= quantidadeRetirar;
      }

      return { movimentacoes, total_retirado: parseFloat(dados.quantidade as any) };
    });
  }

  // Outros métodos permanecem iguais...
  async listar(limit = 100, offset = 0) {
    const result = await db.query(
      `SELECT * FROM vw_estoque_central_completo 
       ORDER BY produto_nome 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  async buscarPorProduto(produtoId: number) {
    const result = await db.query(
      'SELECT * FROM vw_estoque_central_completo WHERE produto_id = $1',
      [produtoId]
    );
    return result.rows[0] || null;
  }

  async listarLotes(estoqueId: number) {
    const result = await db.query(
      `SELECT * FROM estoque_central_lotes 
       WHERE estoque_central_id = $1 AND quantidade > 0
       ORDER BY data_validade ASC`,
      [estoqueId]
    );
    return result.rows;
  }

  async listarLotesProximosVencimento(dias = 30) {
    const result = await db.query(
      `SELECT * FROM vw_lotes_proximos_vencimento 
       WHERE dias_para_vencer <= $1
       ORDER BY dias_para_vencer ASC`,
      [dias]
    );
    return result.rows;
  }

  async listarEstoqueBaixo() {
    const result = await db.query('SELECT * FROM vw_estoque_baixo');
    return result.rows;
  }

  async listarMovimentacoes(
    estoqueId?: number,
    tipo?: string,
    dataInicio?: string,
    dataFim?: string,
    limit = 100,
    offset = 0
  ) {
    let query = `
      SELECT m.*, p.nome as produto_nome, COALESCE(um.codigo, 'UN') as unidade
      FROM estoque_central_movimentacoes m
      INNER JOIN estoque_central ec ON ec.id = m.estoque_central_id
      INNER JOIN produtos p ON p.id = ec.produto_id
      LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
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

