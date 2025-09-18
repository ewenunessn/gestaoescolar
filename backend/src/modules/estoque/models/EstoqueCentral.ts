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

export interface AlertaEstoque {
  id: number;
  produto_id: number;
  lote_id: number | null;
  tipo: 'vencimento_proximo' | 'vencido' | 'estoque_baixo' | 'estoque_zerado';
  nivel: 'info' | 'warning' | 'critical';
  titulo: string;
  descricao: string;
  data_alerta: string;
  visualizado: boolean;
  resolvido: boolean;
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

  // Tabela de alertas
  await db.query(`
    CREATE TABLE IF NOT EXISTS estoque_alertas (
      id SERIAL PRIMARY KEY,
      produto_id INTEGER NOT NULL,
      lote_id INTEGER,
      tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('vencimento_proximo', 'vencido', 'estoque_baixo', 'estoque_zerado')),
      nivel VARCHAR(20) NOT NULL CHECK (nivel IN ('info', 'warning', 'critical')),
      titulo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      data_alerta TIMESTAMP DEFAULT NOW(),
      visualizado BOOLEAN DEFAULT FALSE,
      resolvido BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (produto_id) REFERENCES produtos(id),
      FOREIGN KEY (lote_id) REFERENCES estoque_lotes(id)
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
    CREATE INDEX IF NOT EXISTS idx_alertas_produto ON estoque_alertas(produto_id);
    CREATE INDEX IF NOT EXISTS idx_alertas_tipo ON estoque_alertas(tipo, resolvido);
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

  // Constraint única para alertas não resolvidos
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_alertas_unique 
    ON estoque_alertas(produto_id, COALESCE(lote_id, 0), tipo) 
    WHERE resolvido = FALSE;
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

  // Verificar alertas
  await verificarAlertas(dados.produto_id);

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

  // Se unidade_medida não foi fornecida, buscar do produto
  let unidadeMedida = dados.unidade_medida;
  if (!unidadeMedida) {
    const produto = await db.query('SELECT unidade FROM produtos WHERE id = $1', [dados.produto_id]);
    unidadeMedida = produto.rows[0]?.unidade || null;
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

export async function verificarAlertas(produto_id?: number): Promise<void> {
  const whereClause = produto_id ? 'WHERE p.id = $1' : '';
  const params = produto_id ? [produto_id] : [];

  // Buscar produtos para verificar alertas
  const produtos = await db.query(`
    SELECT 
      p.id,
      p.nome,
      p.estoque_minimo,
      COALESCE(SUM(el.quantidade_atual), 0) as quantidade_total,
      COUNT(CASE WHEN el.status = 'ativo' AND el.quantidade_atual > 0 THEN 1 END) as lotes_ativos
    FROM produtos p
    LEFT JOIN estoque_lotes el ON p.id = el.produto_id
    ${whereClause}
    GROUP BY p.id, p.nome, p.estoque_minimo
  `, params);

  for (const produto of produtos.rows) {
    // Verificar estoque baixo/zerado
    if (produto.quantidade_total <= 0) {
      await criarAlerta({
        produto_id: produto.id,
        tipo: 'estoque_zerado',
        nivel: 'critical',
        titulo: 'Estoque Zerado',
        descricao: `O produto ${produto.nome} está com estoque zerado`
      });
    } else if (produto.estoque_minimo && produto.quantidade_total <= produto.estoque_minimo) {
      await criarAlerta({
        produto_id: produto.id,
        tipo: 'estoque_baixo',
        nivel: 'warning',
        titulo: 'Estoque Baixo',
        descricao: `O produto ${produto.nome} está com estoque baixo (${produto.quantidade_total} unidades)`
      });
    }

    // Verificar lotes vencidos ou próximos do vencimento
    const lotesVencimento = await db.query(`
      SELECT id, lote, data_validade, quantidade_atual
      FROM estoque_lotes
      WHERE produto_id = $1 
        AND status = 'ativo'
        AND data_validade IS NOT NULL
        AND data_validade <= CURRENT_DATE + INTERVAL '30 days'
    `, [produto.id]);

    for (const lote of lotesVencimento.rows) {
      const diasVencimento = Math.ceil((new Date(lote.data_validade).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      if (diasVencimento <= 0) {
        await criarAlerta({
          produto_id: produto.id,
          lote_id: lote.id,
          tipo: 'vencido',
          nivel: 'critical',
          titulo: 'Lote Vencido',
          descricao: `Lote ${lote.lote} do produto ${produto.nome} está vencido`
        });
      } else if (diasVencimento <= 7) {
        await criarAlerta({
          produto_id: produto.id,
          lote_id: lote.id,
          tipo: 'vencimento_proximo',
          nivel: 'warning',
          titulo: 'Vencimento Próximo',
          descricao: `Lote ${lote.lote} do produto ${produto.nome} vence em ${diasVencimento} dias`
        });
      }
    }
  }
}

async function criarAlerta(dados: {
  produto_id: number;
  lote_id?: number;
  tipo: string;
  nivel: string;
  titulo: string;
  descricao: string;
}): Promise<void> {
  try {
    await db.query(`
      INSERT INTO estoque_alertas (produto_id, lote_id, tipo, nivel, titulo, descricao)
      SELECT $1, $2, $3, $4, $5, $6
      WHERE NOT EXISTS (
        SELECT 1 FROM estoque_alertas 
        WHERE produto_id = $1 
          AND COALESCE(lote_id, 0) = COALESCE($2, 0)
          AND tipo = $3
          AND resolvido = FALSE
      )
    `, [
      dados.produto_id,
      dados.lote_id || null,
      dados.tipo,
      dados.nivel,
      dados.titulo,
      dados.descricao
    ]);
  } catch (error) {
    console.warn('Falha ao criar alerta (duplicidade ignorada):', dados.tipo, dados.produto_id);
  }
}

export async function getAlertas(resolvidos: boolean = false): Promise<AlertaEstoque[]> {
  const result = await db.query(`
    SELECT 
      ea.*,
      p.nome as produto_nome,
      el.lote
    FROM estoque_alertas ea
    LEFT JOIN produtos p ON ea.produto_id = p.id
    LEFT JOIN estoque_lotes el ON ea.lote_id = el.id
    WHERE ea.resolvido = $1
    ORDER BY ea.nivel DESC, ea.data_alerta DESC
  `, [resolvidos]);

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

    // Verificar alertas após a saída
    await verificarAlertas(dados.produto_id);

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