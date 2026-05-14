import db from "../../../database";

export type ModoControleSaldoContrato = "modalidades" | "contratos";
export type ContratoProdutoTipoMovimento =
  | "ENTRADA_CONTRATO"
  | "DISTRIBUICAO"
  | "SAIDA_CONSUMO"
  | "ESTORNO"
  | "AJUSTE";
export type ContratoProdutoDirecaoMovimento = "ENTRADA" | "SAIDA" | "AJUSTE";

export interface ConfiguracaoModuloSaldoContrato {
  modulo_principal: ModoControleSaldoContrato;
  mostrar_ambos: boolean;
}

export class ContratoSaldoError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ContratoSaldoError";
    this.statusCode = statusCode;
  }
}

export function validarQuantidadeMovimento(quantidade: unknown): number {
  const quantidadeNumerica = Number(quantidade);
  if (!Number.isFinite(quantidadeNumerica) || quantidadeNumerica <= 0) {
    throw new ContratoSaldoError("Quantidade do movimento deve ser maior que zero");
  }
  return quantidadeNumerica;
}

export function normalizarDirecaoMovimento(
  tipoMovimento: ContratoProdutoTipoMovimento,
): ContratoProdutoDirecaoMovimento {
  if (tipoMovimento === "SAIDA_CONSUMO") return "SAIDA";
  if (tipoMovimento === "AJUSTE") return "AJUSTE";
  return "ENTRADA";
}

export function calcularSaldoDepoisMovimento(input: {
  saldoAtual: number;
  quantidade: number;
  direcao: ContratoProdutoDirecaoMovimento;
}): number {
  const saldoAtual = Number(input.saldoAtual);
  const quantidade = validarQuantidadeMovimento(input.quantidade);
  const saldoDepois = input.direcao === "SAIDA"
    ? saldoAtual - quantidade
    : input.direcao === "AJUSTE"
      ? quantidade
      : saldoAtual + quantidade;

  if (saldoDepois < 0) {
    throw new ContratoSaldoError("Saldo insuficiente para o movimento");
  }

  return saldoDepois;
}

export const CONFIG_SALDO_CONTRATOS_CHAVE = "modulo_saldo_contratos";

const DEFAULT_CONFIG: ConfiguracaoModuloSaldoContrato = {
  modulo_principal: "modalidades",
  mostrar_ambos: false,
};

function normalizarConfig(valor: unknown): ConfiguracaoModuloSaldoContrato {
  if (!valor || typeof valor !== "object") return DEFAULT_CONFIG;

  const parsed = valor as Partial<ConfiguracaoModuloSaldoContrato>;
  return {
    modulo_principal: parsed.modulo_principal === "contratos" ? "contratos" : "modalidades",
    mostrar_ambos: Boolean(parsed.mostrar_ambos),
  };
}

export async function ensureContratoSaldoSchema(client: any = db): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS configuracoes_sistema (
      id SERIAL PRIMARY KEY,
      chave VARCHAR(255) UNIQUE NOT NULL,
      valor TEXT,
      descricao TEXT,
      tipo VARCHAR(50) DEFAULT 'string',
      categoria VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    ALTER TABLE configuracoes_sistema
      ADD COLUMN IF NOT EXISTS valor TEXT,
      ADD COLUMN IF NOT EXISTS descricao TEXT,
      ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'string',
      ADD COLUMN IF NOT EXISTS categoria VARCHAR(100),
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_configuracoes_sistema_chave_unique
      ON configuracoes_sistema(chave)
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS contrato_produto_saldos (
      id SERIAL PRIMARY KEY,
      contrato_produto_id INTEGER NOT NULL REFERENCES contrato_produtos(id) ON DELETE CASCADE,
      modalidade_financeira_id INTEGER,
      saldo_inicial DECIMAL(12,3) NOT NULL DEFAULT 0,
      saldo_atual DECIMAL(12,3) NOT NULL DEFAULT 0,
      quantidade_consumida DECIMAL(12,3) NOT NULL DEFAULT 0,
      ativo BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (contrato_produto_id, modalidade_financeira_id),
      CHECK (saldo_inicial >= 0),
      CHECK (saldo_atual >= 0),
      CHECK (quantidade_consumida >= 0)
    )
  `);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_contrato_produto_saldos_item_simples
      ON contrato_produto_saldos(contrato_produto_id)
      WHERE modalidade_financeira_id IS NULL
  `);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_contrato_produto_saldos_item_modalidade
      ON contrato_produto_saldos(contrato_produto_id, modalidade_financeira_id)
      WHERE modalidade_financeira_id IS NOT NULL
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS contrato_produto_ledger (
      id SERIAL PRIMARY KEY,
      contrato_produto_id INTEGER NOT NULL REFERENCES contrato_produtos(id) ON DELETE CASCADE,
      modalidade_financeira_id INTEGER,
      tipo_movimento VARCHAR(40) NOT NULL,
      direcao VARCHAR(10) NOT NULL,
      quantidade DECIMAL(12,3) NOT NULL,
      saldo_antes DECIMAL(12,3) NOT NULL,
      saldo_depois DECIMAL(12,3) NOT NULL,
      descricao TEXT,
      origem_tipo VARCHAR(60),
      origem_id INTEGER,
      movimento_referenciado_id INTEGER REFERENCES contrato_produto_ledger(id),
      criado_por INTEGER,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CHECK (direcao IN ('ENTRADA', 'SAIDA', 'AJUSTE')),
      CHECK (quantidade > 0),
      CHECK (saldo_antes >= 0),
      CHECK (saldo_depois >= 0)
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_contrato_produto_ledger_saldo
      ON contrato_produto_ledger(contrato_produto_id, modalidade_financeira_id, criado_em)
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS contrato_produtos_saldos (
      id SERIAL PRIMARY KEY,
      contrato_produto_id INTEGER NOT NULL REFERENCES contrato_produtos(id) ON DELETE CASCADE,
      quantidade_inicial DECIMAL(10,3) NOT NULL DEFAULT 0,
      quantidade_consumida DECIMAL(10,3) NOT NULL DEFAULT 0,
      quantidade_disponivel DECIMAL(10,3) GENERATED ALWAYS AS (quantidade_inicial - quantidade_consumida) STORED,
      ativo BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(contrato_produto_id)
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS contrato_produtos_saldos_historico (
      id SERIAL PRIMARY KEY,
      contrato_produto_saldo_id INTEGER NOT NULL REFERENCES contrato_produtos_saldos(id) ON DELETE CASCADE,
      quantidade DECIMAL(10,3) NOT NULL,
      tipo_movimentacao VARCHAR(20) NOT NULL DEFAULT 'CONSUMO',
      data_consumo DATE NOT NULL DEFAULT CURRENT_DATE,
      observacao TEXT,
      usuario_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_contrato_produtos_modalidades_id_unique
      ON contrato_produtos_modalidades(id)
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS contrato_produtos_modalidades_historico (
      id SERIAL PRIMARY KEY,
      contrato_produto_modalidade_id INTEGER NOT NULL REFERENCES contrato_produtos_modalidades(id) ON DELETE CASCADE,
      quantidade DECIMAL(10,2) NOT NULL,
      data_consumo DATE NOT NULL,
      observacao TEXT,
      usuario_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_contrato_produtos_saldos_contrato_produto
    ON contrato_produtos_saldos(contrato_produto_id)
  `);

  await client.query(`
    ALTER TABLE faturamentos_itens
      ADD COLUMN IF NOT EXISTS saldo_consumo_modo VARCHAR(20),
      ADD COLUMN IF NOT EXISTS saldo_consumo_ref_id INTEGER
  `);

  await client.query(`
    INSERT INTO contrato_produto_saldos (
      contrato_produto_id,
      modalidade_financeira_id,
      saldo_inicial,
      saldo_atual,
      quantidade_consumida,
      ativo,
      created_at,
      updated_at
    )
    SELECT
      contrato_produto_id,
      NULL,
      quantidade_inicial,
      quantidade_disponivel,
      quantidade_consumida,
      ativo,
      created_at,
      updated_at
    FROM contrato_produtos_saldos
    ON CONFLICT DO NOTHING
  `);

  await client.query(`
    INSERT INTO contrato_produto_saldos (
      contrato_produto_id,
      modalidade_financeira_id,
      saldo_inicial,
      saldo_atual,
      quantidade_consumida,
      ativo,
      created_at,
      updated_at
    )
    SELECT
      contrato_produto_id,
      modalidade_id,
      quantidade_inicial,
      quantidade_disponivel,
      quantidade_consumida,
      ativo,
      created_at,
      updated_at
    FROM contrato_produtos_modalidades
    ON CONFLICT DO NOTHING
  `);

  await client.query(`
    INSERT INTO configuracoes_sistema (chave, valor, descricao, tipo, categoria)
    VALUES ($1, $2, 'Configuracao do modo oficial de saldo de contratos', 'json', 'saldos')
    ON CONFLICT (chave) DO NOTHING
  `, [CONFIG_SALDO_CONTRATOS_CHAVE, JSON.stringify(DEFAULT_CONFIG)]);
}

export async function obterConfiguracaoSaldoContrato(client: any = db): Promise<ConfiguracaoModuloSaldoContrato> {
  await ensureContratoSaldoSchema(client);

  const result = await client.query(
    "SELECT valor FROM configuracoes_sistema WHERE chave = $1 LIMIT 1",
    [CONFIG_SALDO_CONTRATOS_CHAVE]
  );

  if (result.rows.length === 0) return DEFAULT_CONFIG;

  try {
    return normalizarConfig(JSON.parse(result.rows[0].valor || "{}"));
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function obterAvisosTrocaModoSaldo(client: any = db) {
  await ensureContratoSaldoSchema(client);

  const result = await client.query(`
    SELECT
      (SELECT COUNT(*)::int FROM contrato_produto_saldos WHERE modalidade_financeira_id IS NOT NULL AND ativo = true) AS saldos_modalidades,
      (SELECT COUNT(*)::int FROM contrato_produto_saldos WHERE modalidade_financeira_id IS NULL AND ativo = true) AS saldos_itens,
      (SELECT COUNT(*)::int FROM contrato_produto_ledger WHERE modalidade_financeira_id IS NOT NULL) AS movimentacoes_modalidades,
      (SELECT COUNT(*)::int FROM contrato_produto_ledger WHERE modalidade_financeira_id IS NULL) AS movimentacoes_itens
  `);

  const row = result.rows[0] || {};
  return {
    saldos_modalidades: Number(row.saldos_modalidades || 0),
    saldos_itens: Number(row.saldos_itens || 0),
    movimentacoes_modalidades: Number(row.movimentacoes_modalidades || 0),
    movimentacoes_itens: Number(row.movimentacoes_itens || 0),
  };
}

export async function salvarConfiguracaoSaldoContrato(
  config: ConfiguracaoModuloSaldoContrato,
  client: any = db
) {
  await ensureContratoSaldoSchema(client);

  const normalizada = normalizarConfig(config);
  await client.query(`
    INSERT INTO configuracoes_sistema (chave, valor, descricao, tipo, categoria)
    VALUES ($1, $2, 'Configuracao do modo oficial de saldo de contratos', 'json', 'saldos')
    ON CONFLICT (chave) DO UPDATE
      SET valor = EXCLUDED.valor,
          tipo = EXCLUDED.tipo,
          categoria = EXCLUDED.categoria,
          updated_at = CURRENT_TIMESTAMP
  `, [CONFIG_SALDO_CONTRATOS_CHAVE, JSON.stringify(normalizada)]);

  return normalizada;
}

export function saldoDisponivelContratoProdutoSql(
  contratoProdutoAlias: string = "cp",
  fallbackSql: string = "0"
): string {
  return `
    COALESCE(
      CASE
        WHEN COALESCE((
          SELECT valor::jsonb->>'modulo_principal'
          FROM configuracoes_sistema
          WHERE chave = '${CONFIG_SALDO_CONTRATOS_CHAVE}'
          LIMIT 1
        ), 'modalidades') = 'contratos' THEN (
          SELECT cps.saldo_atual
          FROM contrato_produto_saldos cps
          WHERE cps.contrato_produto_id = ${contratoProdutoAlias}.id
            AND cps.modalidade_financeira_id IS NULL
            AND cps.ativo = true
          LIMIT 1
        )
        ELSE (
          SELECT SUM(cpm2.saldo_atual)
          FROM contrato_produto_saldos cpm2
          WHERE cpm2.contrato_produto_id = ${contratoProdutoAlias}.id
            AND cpm2.modalidade_financeira_id IS NOT NULL
            AND cpm2.ativo = true
        )
      END,
      ${fallbackSql}
    )
  `;
}

function calcularQuantidadeConsumidaDepois(input: {
  quantidadeConsumidaAtual: number;
  quantidade: number;
  tipoMovimento: ContratoProdutoTipoMovimento;
}): number {
  const quantidadeConsumidaAtual = Number(input.quantidadeConsumidaAtual || 0);
  if (input.tipoMovimento === "SAIDA_CONSUMO") {
    return quantidadeConsumidaAtual + input.quantidade;
  }
  if (input.tipoMovimento === "ESTORNO") {
    return Math.max(quantidadeConsumidaAtual - input.quantidade, 0);
  }
  return quantidadeConsumidaAtual;
}

function validarContratoProdutoAtivo(row: any): void {
  if (!row) {
    throw new ContratoSaldoError("Produto contratado nao encontrado", 404);
  }
  if (row.contrato_ativo === false || String(row.contrato_status || "").toLowerCase() !== "ativo") {
    throw new ContratoSaldoError("Contrato nao esta ativo");
  }

  const hoje = new Date();
  const dataInicio = row.data_inicio ? new Date(row.data_inicio) : null;
  const dataFim = row.data_fim ? new Date(row.data_fim) : null;
  if ((dataInicio && hoje < dataInicio) || (dataFim && hoje > dataFim)) {
    throw new ContratoSaldoError("Contrato fora da vigencia");
  }
}

export async function registrarMovimentoContratoProduto(
  client: any,
  input: {
    contratoProdutoId: number;
    modalidadeFinanceiraId?: number | null;
    tipoMovimento: ContratoProdutoTipoMovimento;
    quantidade: number;
    descricao?: string | null;
    origemTipo?: string | null;
    origemId?: number | null;
    criadoPor?: number | null;
    movimentoReferenciadoId?: number | null;
    saldoDepois?: number | null;
  },
): Promise<{ ledgerId: number; saldoId: number; saldoAntes: number; saldoDepois: number }> {
  await ensureContratoSaldoSchema(client);

  const quantidade = validarQuantidadeMovimento(input.quantidade);
  const direcao = normalizarDirecaoMovimento(input.tipoMovimento);
  const modalidadeFinanceiraId = input.modalidadeFinanceiraId ?? null;

  const contratoResult = await client.query(`
    SELECT
      cp.id,
      cp.quantidade_contratada,
      c.status as contrato_status,
      c.ativo as contrato_ativo,
      c.data_inicio,
      c.data_fim
    FROM contrato_produtos cp
    JOIN contratos c ON c.id = cp.contrato_id
    WHERE cp.id = $1
      AND cp.ativo = true
    FOR UPDATE OF cp
  `, [input.contratoProdutoId]);

  validarContratoProdutoAtivo(contratoResult.rows[0]);

  const saldoResult = await client.query(`
    SELECT
      id,
      contrato_produto_id,
      modalidade_financeira_id,
      saldo_inicial,
      saldo_atual,
      quantidade_consumida
    FROM contrato_produto_saldos
    WHERE contrato_produto_id = $1
      AND (
        (modalidade_financeira_id IS NULL AND $2::int IS NULL)
        OR modalidade_financeira_id = $2::int
      )
      AND ativo = true
    FOR UPDATE
  `, [input.contratoProdutoId, modalidadeFinanceiraId]);

  if (saldoResult.rows.length === 0) {
    throw new ContratoSaldoError("Saldo do produto contratado nao encontrado");
  }

  const saldo = saldoResult.rows[0];
  const saldoAntes = Number(saldo.saldo_atual || 0);
  const saldoDepois = input.saldoDepois == null
    ? calcularSaldoDepoisMovimento({ saldoAtual: saldoAntes, quantidade, direcao })
    : Number(input.saldoDepois);

  if (!Number.isFinite(saldoDepois) || saldoDepois < 0) {
    throw new ContratoSaldoError("Saldo depois do movimento deve ser maior ou igual a zero");
  }

  const quantidadeConsumidaDepois = calcularQuantidadeConsumidaDepois({
    quantidadeConsumidaAtual: Number(saldo.quantidade_consumida || 0),
    quantidade,
    tipoMovimento: input.tipoMovimento,
  });

  const ledgerResult = await client.query(`
    INSERT INTO contrato_produto_ledger (
      contrato_produto_id,
      modalidade_financeira_id,
      tipo_movimento,
      direcao,
      quantidade,
      saldo_antes,
      saldo_depois,
      descricao,
      origem_tipo,
      origem_id,
      movimento_referenciado_id,
      criado_por
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id
  `, [
    input.contratoProdutoId,
    modalidadeFinanceiraId,
    input.tipoMovimento,
    direcao,
    quantidade,
    saldoAntes,
    saldoDepois,
    input.descricao ?? null,
    input.origemTipo ?? null,
    input.origemId ?? null,
    input.movimentoReferenciadoId ?? null,
    input.criadoPor ?? null,
  ]);

  await client.query(`
    UPDATE contrato_produto_saldos
    SET saldo_atual = $1,
        quantidade_consumida = $2,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING id, saldo_atual, quantidade_consumida
  `, [saldoDepois, quantidadeConsumidaDepois, saldo.id]);

  return {
    ledgerId: Number(ledgerResult.rows[0].id),
    saldoId: Number(saldo.id),
    saldoAntes,
    saldoDepois,
  };
}

async function buscarItemFaturamentoParaSaldo(client: any, faturamentoId: number, itemId: number) {
  const result = await client.query(`
    SELECT
      fi.id,
      fi.faturamento_pedido_id,
      fi.pedido_item_id,
      fi.modalidade_id,
      fi.quantidade_alocada,
      fi.consumo_registrado,
      fi.saldo_consumo_modo,
      fi.saldo_consumo_ref_id,
      pi.contrato_produto_id,
      prod.nome as produto_nome
    FROM faturamentos_itens fi
    JOIN pedido_itens pi ON pi.id = fi.pedido_item_id
    LEFT JOIN contrato_produtos cp ON cp.id = pi.contrato_produto_id
    LEFT JOIN produtos prod ON prod.id = cp.produto_id
    WHERE fi.id = $1
      AND fi.faturamento_pedido_id = $2
    FOR UPDATE OF fi
  `, [itemId, faturamentoId]);

  return result.rows[0] ?? null;
}

export async function registrarConsumoSaldoFaturamentoItem(
  client: any,
  input: { faturamentoId: number; itemId: number; usuarioId?: number | null }
) {
  await ensureContratoSaldoSchema(client);
  const item = await buscarItemFaturamentoParaSaldo(client, input.faturamentoId, input.itemId);

  if (!item) {
    throw new ContratoSaldoError("Item de faturamento nao encontrado", 404);
  }
  if (item.consumo_registrado) {
    return { changed: false, modo: item.saldo_consumo_modo, movimentoId: item.saldo_consumo_ref_id };
  }
  if (!item.contrato_produto_id) {
    throw new ContratoSaldoError("Item de faturamento sem contrato vinculado");
  }

  const quantidade = Number(item.quantidade_alocada || 0);
  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    throw new ContratoSaldoError("Quantidade de consumo invalida");
  }

  const config = await obterConfiguracaoSaldoContrato(client);
  const movimento = await registrarMovimentoContratoProduto(client, {
    contratoProdutoId: Number(item.contrato_produto_id),
    modalidadeFinanceiraId: config.modulo_principal === "contratos" ? null : Number(item.modalidade_id),
    tipoMovimento: "SAIDA_CONSUMO",
    quantidade,
    descricao: `Consumo do faturamento ${input.faturamentoId}`,
    origemTipo: "faturamento_item",
    origemId: Number(item.id),
    criadoPor: input.usuarioId ?? null,
  });

  await client.query(`
    UPDATE faturamentos_itens
    SET consumo_registrado = true,
        data_consumo = CURRENT_TIMESTAMP,
        saldo_consumo_modo = $1,
        saldo_consumo_ref_id = $2,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
  `, [config.modulo_principal, movimento.ledgerId, item.id]);

  return { changed: true, modo: config.modulo_principal, movimentoId: movimento.ledgerId };
}

export async function estornarConsumoSaldoFaturamentoItem(
  client: any,
  input: { faturamentoId: number; itemId: number }
) {
  await ensureContratoSaldoSchema(client);
  const item = await buscarItemFaturamentoParaSaldo(client, input.faturamentoId, input.itemId);

  if (!item) {
    throw new ContratoSaldoError("Item de faturamento nao encontrado", 404);
  }
  if (!item.consumo_registrado) {
    return { changed: false };
  }
  if (!item.saldo_consumo_modo || !item.saldo_consumo_ref_id) {
    throw new ContratoSaldoError("Item consumido sem vinculo de movimentacao de saldo para estorno");
  }

  const ledgerResult = await client.query(`
    SELECT
      id,
      contrato_produto_id,
      modalidade_financeira_id,
      quantidade,
      tipo_movimento
    FROM contrato_produto_ledger
    WHERE id = $1
    FOR UPDATE
  `, [item.saldo_consumo_ref_id]);

  if (ledgerResult.rows.length === 0) {
    throw new ContratoSaldoError("Movimentacao de saldo nao encontrada para estorno");
  }

  const movimento = ledgerResult.rows[0];
  await registrarMovimentoContratoProduto(client, {
    contratoProdutoId: Number(movimento.contrato_produto_id),
    modalidadeFinanceiraId: movimento.modalidade_financeira_id === null ? null : Number(movimento.modalidade_financeira_id),
    tipoMovimento: "ESTORNO",
    quantidade: Number(movimento.quantidade),
    descricao: `Estorno do consumo do faturamento ${input.faturamentoId}`,
    origemTipo: "faturamento_item_estorno",
    origemId: Number(item.id),
    movimentoReferenciadoId: Number(movimento.id),
  });

  await client.query(`
    UPDATE faturamentos_itens
    SET consumo_registrado = false,
        data_consumo = NULL,
        saldo_consumo_modo = NULL,
        saldo_consumo_ref_id = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [item.id]);

  return { changed: true };
}
