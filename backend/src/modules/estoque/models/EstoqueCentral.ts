const db = require("../../../database");

// Interfaces principais
export interface EstoqueLote {
  id: number;
  produto_id: number;
  lote: string;
  quantidade_inicial: number;
  quantidade_atual: number;
  data_fabricacao: string | null;
  data_validade: string | null;
  fornecedor_id: number | null;
  recebimento_id: number | null;
  observacoes: string | null;
  status: 'ativo' | 'vencido' | 'bloqueado' | 'esgotado';
  created_at: string;
  updated_at: string;
}

export interface MovimentacaoEstoque {
  id: number;
  lote_id: number;
  produto_id: number;
  tipo: 'entrada' | 'saida' | 'ajuste' | 'transferencia' | 'perda';
  quantidade: number;
  quantidade_anterior: number;
  quantidade_posterior: number;
  motivo: string;
  documento_referencia: string | null;
  usuario_id: number;
  data_movimentacao: string;
  observacoes: string | null;
}

export interface EstoquePosicao {
  produto_id: number;
  produto_nome: string;
  produto_unidade: string;
  quantidade_total: number;
  quantidade_disponivel: number;
  quantidade_reservada: number;
  quantidade_vencida: number;
  lotes_ativos: number;
  proximo_vencimento: string | null;
}

// Criação das tabelas PostgreSQL
export async function createEstoqueCentralTables() {
  // Tabela de lotes de estoque
  await db.query(`
    CREATE TABLE IF NOT EXISTS estoque_lotes (
      id SERIAL PRIMARY KEY,
      produto_id INTEGER NOT NULL,
      lote TEXT NOT NULL,
      quantidade_inicial DECIMAL(10,3) NOT NULL DEFAULT 0,
      quantidade_atual DECIMAL(10,3) NOT NULL DEFAULT 0,
      data_fabricacao DATE,
      data_validade DATE,
      fornecedor_id INTEGER,
      observacoes TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'vencido', 'bloqueado', 'esgotado')),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (produto_id) REFERENCES produtos(id),
      FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id),
      CONSTRAINT uk_produto_lote UNIQUE(produto_id, lote)
    )
  `);

  // Tabela de movimentações
  await db.query(`
    CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
      id SERIAL PRIMARY KEY,
      lote_id INTEGER NOT NULL,
      produto_id INTEGER NOT NULL,
      tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste', 'transferencia', 'perda')),
      quantidade DECIMAL(10,3) NOT NULL,
      quantidade_anterior DECIMAL(10,3) NOT NULL,
      quantidade_posterior DECIMAL(10,3) NOT NULL,
      motivo TEXT NOT NULL,
      documento_referencia TEXT,
      usuario_id INTEGER NOT NULL,
      data_movimentacao TIMESTAMP DEFAULT NOW(),
      observacoes TEXT,
      FOREIGN KEY (lote_id) REFERENCES estoque_lotes(id),
      FOREIGN KEY (produto_id) REFERENCES produtos(id)
    )
  `);

  // Índices para performance
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_estoque_lotes_produto ON estoque_lotes(produto_id);
    CREATE INDEX IF NOT EXISTS idx_estoque_lotes_status ON estoque_lotes(status);
    CREATE INDEX IF NOT EXISTS idx_estoque_lotes_validade ON estoque_lotes(data_validade);
    CREATE INDEX IF NOT EXISTS idx_movimentacoes_lote ON estoque_movimentacoes(lote_id);
    CREATE INDEX IF NOT EXISTS idx_movimentacoes_produto ON estoque_movimentacoes(produto_id);
    CREATE INDEX IF NOT EXISTS idx_movimentacoes_data ON estoque_movimentacoes(data_movimentacao);
  `);

  // Trigger para atualizar updated_at
  await db.query(`
    CREATE OR REPLACE FUNCTION update_estoque_lotes_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await db.query(`
    DROP TRIGGER IF EXISTS update_estoque_lotes_timestamp ON estoque_lotes;
    CREATE TRIGGER update_estoque_lotes_timestamp
      BEFORE UPDATE ON estoque_lotes
      FOR EACH ROW
      EXECUTE FUNCTION update_estoque_lotes_timestamp();
  `);
}

// Funções de entrada de estoque
export async function criarLoteEstoque(dados: {
  produto_id: number;
  lote: string;
  quantidade: number;
  data_fabricacao?: string;
  data_validade?: string;
  fornecedor_id?: number;
  recebimento_id?: number;
  observacoes?: string;
  usuario_id: number;
}): Promise<EstoqueLote> {
  
  // Verificar se lote já existe para o produto
  const loteExistente = await db.query(
    'SELECT id FROM estoque_lotes WHERE produto_id = $1 AND lote = $2',
    [dados.produto_id, dados.lote]
  );
  
  if (loteExistente.rows.length > 0) {
    throw new Error(`Lote ${dados.lote} já existe para este produto`);
  }

  // Inserir lote
  const result = await db.query(`
    INSERT INTO estoque_lotes (
      produto_id, lote, quantidade_inicial, quantidade_atual,
      data_fabricacao, data_validade, fornecedor_id, 
      observacoes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
  `, [
    dados.produto_id,
    dados.lote,
    dados.quantidade,
    dados.quantidade,
    dados.data_fabricacao || null,
    dados.data_validade || null,
    dados.fornecedor_id || null,

    dados.observacoes || null
  ]);

  const loteId = result.rows[0].id;

  // Registrar movimentação de entrada
  await registrarMovimentacao({
    lote_id: loteId,
    produto_id: dados.produto_id,
    tipo: 'entrada',
    quantidade: dados.quantidade,
    quantidade_anterior: 0,
    quantidade_posterior: dados.quantidade,
    motivo: dados.recebimento_id ? `Recebimento #${dados.recebimento_id}` : 'Entrada manual',
    documento_referencia: dados.recebimento_id?.toString(),
    usuario_id: dados.usuario_id,
    observacoes: dados.observacoes
  });

  // Retornar lote criado
  return await getLoteById(loteId);
}

export async function registrarMovimentacao(dados: {
  lote_id: number;
  produto_id: number;
  tipo: 'entrada' | 'saida' | 'ajuste' | 'transferencia' | 'perda';
  quantidade: number;
  quantidade_anterior: number;
  quantidade_posterior: number;
  motivo: string;
  documento_referencia?: string;
  usuario_id: number;
  observacoes?: string;
  unidade_medida?: string;
}): Promise<MovimentacaoEstoque> {

  // Since units are now defined in contracts, use provided unit or default
  let unidadeMedida = dados.unidade_medida;
  if (!unidadeMedida) {
    // Use default unit since units are no longer stored in products table
    unidadeMedida = 'kg'; // Default unit for inventory tracking
  }

  const result = await db.query(`
    INSERT INTO estoque_movimentacoes (
      lote_id, produto_id, tipo, quantidade, quantidade_anterior,
      quantidade_posterior, motivo, documento_referencia, usuario_id, observacoes, unidade_medida
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id
  `, [
    dados.lote_id,
    dados.produto_id,
    dados.tipo,
    dados.quantidade,
    dados.quantidade_anterior,
    dados.quantidade_posterior,
    dados.motivo,
    dados.documento_referencia || null,
    dados.usuario_id,
    dados.observacoes || null,
    unidadeMedida
  ]);

  return await getMovimentacaoById(result.rows[0].id);
}

export async function getLoteById(id: number): Promise<EstoqueLote> {
  const result = await db.query(`
    SELECT 
      el.*,
      p.nome as produto_nome,
      p.unidade as produto_unidade,
      f.nome as fornecedor_nome
    FROM estoque_lotes el
    LEFT JOIN produtos p ON el.produto_id = p.id
    LEFT JOIN fornecedores f ON el.fornecedor_id = f.id
    WHERE el.id = $1
  `, [id]);

  if (result.rows.length === 0) {
    throw new Error('Lote não encontrado');
  }

  return result.rows[0];
}

export async function getMovimentacaoById(id: number): Promise<MovimentacaoEstoque> {
  const result = await db.query(`
    SELECT * FROM estoque_movimentacoes WHERE id = $1
  `, [id]);

  if (result.rows.length === 0) {
    throw new Error('Movimentação não encontrada');
  }

  return result.rows[0];
}

export async function getLotesProduto(produto_id: number, apenasAtivos: boolean = true): Promise<EstoqueLote[]> {
  let whereClause = 'WHERE el.produto_id = $1';
  const params: any[] = [produto_id];
  
  if (apenasAtivos) {
    whereClause += " AND el.status = 'ativo' AND el.quantidade_atual > 0";
  }
  
  const result = await db.query(`
    SELECT 
      el.*,
      p.nome as produto_nome,
      p.unidade as produto_unidade,
      f.nome as fornecedor_nome
    FROM estoque_lotes el
    LEFT JOIN produtos p ON el.produto_id = p.id
    LEFT JOIN fornecedores f ON el.fornecedor_id = f.id
    ${whereClause}
    ORDER BY el.data_validade ASC NULLS LAST, el.created_at ASC
  `, params);

  return result.rows;
}

export async function getPosicaoEstoque(mostrarTodos: boolean = false): Promise<EstoquePosicao[]> {
  let havingClause = '';
  if (!mostrarTodos) {
    havingClause = 'HAVING COALESCE(SUM(el.quantidade_atual), 0) > 0';
  }
  
  const result = await db.query(`
    SELECT 
      p.id as produto_id,
      p.nome as produto_nome,
      p.unidade as produto_unidade,
      COALESCE(SUM(el.quantidade_atual), 0) as quantidade_total,
      COALESCE(SUM(CASE WHEN el.status = 'ativo' THEN el.quantidade_atual ELSE 0 END), 0) as quantidade_disponivel,
      0 as quantidade_reservada,
      COALESCE(SUM(CASE WHEN el.status = 'vencido' THEN el.quantidade_atual ELSE 0 END), 0) as quantidade_vencida,
      COUNT(CASE WHEN el.status = 'ativo' AND el.quantidade_atual > 0 THEN 1 END) as lotes_ativos,
      MIN(CASE WHEN el.status = 'ativo' AND el.data_validade IS NOT NULL THEN el.data_validade END) as proximo_vencimento
    FROM produtos p
    LEFT JOIN estoque_lotes el ON p.id = el.produto_id
    WHERE p.ativo = true
    GROUP BY p.id, p.nome, p.unidade
    ${havingClause}
    ORDER BY p.nome
  `);

  return result.rows;
}

export async function getMovimentacoesProduto(produto_id: number, limite: number = 50): Promise<MovimentacaoEstoque[]> {
  const result = await db.query(`
    SELECT 
      em.*,
      el.lote,
      p.nome as produto_nome,
      COALESCE(em.unidade_medida, p.unidade) as produto_unidade
    FROM estoque_movimentacoes em
    LEFT JOIN estoque_lotes el ON em.lote_id = el.id
    LEFT JOIN produtos p ON em.produto_id = p.id
    WHERE em.produto_id = $1
    ORDER BY em.data_movimentacao DESC
    LIMIT $2
  `, [produto_id, limite]);

  return result.rows;
}



export async function processarSaida(dados: {
  produto_id: number;
  quantidade: number;
  motivo: string;
  documento_referencia?: string;
  usuario_id: number;
  observacoes?: string;
}): Promise<{success: boolean, lotes_utilizados: any[], quantidade_processada: number}> {
  
  const quantidadeDesejada = dados.quantidade;
  let quantidadeRestante = quantidadeDesejada;
  const lotesUtilizados: any[] = [];

  // Buscar lotes disponíveis (FIFO por data de validade)
  const lotesDisponiveis = await db.query(`
    SELECT id, lote, quantidade_atual, data_validade
    FROM estoque_lotes
    WHERE produto_id = $1 
      AND status = 'ativo' 
      AND quantidade_atual > 0
    ORDER BY 
      CASE WHEN data_validade IS NULL THEN 1 ELSE 0 END,
      data_validade ASC,
      created_at ASC
  `, [dados.produto_id]);

  if (lotesDisponiveis.rows.length === 0) {
    throw new Error('Não há estoque disponível para este produto');
  }

  try {
    await db.query('BEGIN');

    for (const lote of lotesDisponiveis.rows) {
      if (quantidadeRestante <= 0) break;

      const quantidadeUsar = Math.min(quantidadeRestante, lote.quantidade_atual);
      const novaQuantidade = lote.quantidade_atual - quantidadeUsar;
      const novoStatus = novaQuantidade === 0 ? 'esgotado' : 'ativo';

      // Atualizar quantidade do lote
      await db.query(`
        UPDATE estoque_lotes 
        SET quantidade_atual = $1, status = $2
        WHERE id = $3
      `, [novaQuantidade, novoStatus, lote.id]);

      // Registrar movimentação
      await registrarMovimentacao({
        lote_id: lote.id,
        produto_id: dados.produto_id,
        tipo: 'saida',
        quantidade: quantidadeUsar,
        quantidade_anterior: lote.quantidade_atual,
        quantidade_posterior: novaQuantidade,
        motivo: dados.motivo,
        documento_referencia: dados.documento_referencia,
        usuario_id: dados.usuario_id,
        observacoes: dados.observacoes
      });

      lotesUtilizados.push({
        lote_id: lote.id,
        lote: lote.lote,
        quantidade_utilizada: quantidadeUsar,
        quantidade_anterior: lote.quantidade_atual,
        quantidade_posterior: novaQuantidade
      });

      quantidadeRestante -= quantidadeUsar;
    }

    await db.query('COMMIT');

    return {
      success: true,
      lotes_utilizados: lotesUtilizados,
      quantidade_processada: quantidadeDesejada - quantidadeRestante
    };

  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

export async function registrarEntrada(dados: {
  produto_id: number;
  quantidade: number;
  data_validade?: string;
  fornecedor_id?: number;
  nota_fiscal?: string;
  usuario_id: number;
  observacoes?: string;
  lote?: string;
  recebimento_id?: number; // Adicionar este campo
}): Promise<EstoqueLote> {

  // Validar produto
  const produto = await db.query('SELECT * FROM produtos WHERE id = $1', [dados.produto_id]);
  if (produto.rows.length === 0) {
    throw new Error('Produto não encontrado');
  }

  // Criar lote
  const loteResult = await db.query(`
    INSERT INTO estoque_lotes (
      produto_id, quantidade_inicial, quantidade_atual, lote,
      data_validade, fornecedor_id, nota_fiscal, status, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ativo', NOW(), NOW())
    RETURNING id
  `, [
    dados.produto_id,
    dados.quantidade,
    dados.quantidade,
    dados.lote || `LOT-${Date.now()}`,
    dados.data_validade || null,
    dados.fornecedor_id || null,
    dados.nota_fiscal || null
  ]);

  const loteId = loteResult.rows[0].id;

  // Registrar movimentação
  await registrarMovimentacao({
    lote_id: loteId,
    produto_id: dados.produto_id,
    tipo: 'entrada',
    quantidade: dados.quantidade,
    quantidade_anterior: 0,
    quantidade_posterior: dados.quantidade,
    motivo: dados.recebimento_id ? `Recebimento #${dados.recebimento_id}` : 'Entrada manual',
    documento_referencia: dados.recebimento_id?.toString(),
    usuario_id: dados.usuario_id,
    observacoes: dados.observacoes
  });

  // Retornar lote criado
  return await getLoteById(loteId);
}