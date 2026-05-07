import db from "../../../database";

export type ModoControleSaldoContrato = "modalidades" | "contratos";

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
      (SELECT COUNT(*)::int FROM contrato_produtos_modalidades WHERE ativo = true) AS saldos_modalidades,
      (SELECT COUNT(*)::int FROM contrato_produtos_saldos WHERE ativo = true) AS saldos_itens,
      (SELECT COUNT(*)::int FROM contrato_produtos_modalidades_historico) AS movimentacoes_modalidades,
      (SELECT COUNT(*)::int FROM contrato_produtos_saldos_historico) AS movimentacoes_itens
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
          SELECT cps.quantidade_disponivel
          FROM contrato_produtos_saldos cps
          WHERE cps.contrato_produto_id = ${contratoProdutoAlias}.id
            AND cps.ativo = true
          LIMIT 1
        )
        ELSE (
          SELECT SUM(cpm2.quantidade_disponivel)
          FROM contrato_produtos_modalidades cpm2
          WHERE cpm2.contrato_produto_id = ${contratoProdutoAlias}.id
            AND cpm2.ativo = true
        )
      END,
      ${fallbackSql}
    )
  `;
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
  let movimentoId: number;

  if (config.modulo_principal === "contratos") {
    const saldoResult = await client.query(`
      SELECT id, quantidade_disponivel
      FROM contrato_produtos_saldos
      WHERE contrato_produto_id = $1
        AND ativo = true
      FOR UPDATE
    `, [item.contrato_produto_id]);

    if (saldoResult.rows.length === 0) {
      throw new ContratoSaldoError(`Saldo por item nao cadastrado para ${item.produto_nome || "produto"}`);
    }

    const saldo = saldoResult.rows[0];
    if (Number(saldo.quantidade_disponivel || 0) < quantidade) {
      throw new ContratoSaldoError(`Saldo por item insuficiente. Disponivel: ${Number(saldo.quantidade_disponivel || 0).toFixed(2)}`);
    }

    await client.query(`
      UPDATE contrato_produtos_saldos
      SET quantidade_consumida = quantidade_consumida + $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [quantidade, saldo.id]);

    const historico = await client.query(`
      INSERT INTO contrato_produtos_saldos_historico
        (contrato_produto_saldo_id, quantidade, tipo_movimentacao, data_consumo, observacao, usuario_id)
      VALUES ($1, $2, 'CONSUMO', CURRENT_DATE, $3, $4)
      RETURNING id
    `, [saldo.id, quantidade, `Consumo do faturamento ${input.faturamentoId}`, input.usuarioId ?? null]);
    movimentoId = historico.rows[0].id;
  } else {
    const saldoResult = await client.query(`
      SELECT id, quantidade_disponivel
      FROM contrato_produtos_modalidades
      WHERE contrato_produto_id = $1
        AND modalidade_id = $2
        AND ativo = true
      FOR UPDATE
    `, [item.contrato_produto_id, item.modalidade_id]);

    if (saldoResult.rows.length === 0) {
      throw new ContratoSaldoError(`Saldo por modalidade nao cadastrado para ${item.produto_nome || "produto"}`);
    }

    const saldo = saldoResult.rows[0];
    if (Number(saldo.quantidade_disponivel || 0) < quantidade) {
      throw new ContratoSaldoError(`Saldo por modalidade insuficiente. Disponivel: ${Number(saldo.quantidade_disponivel || 0).toFixed(2)}`);
    }

    await client.query(`
      UPDATE contrato_produtos_modalidades
      SET quantidade_consumida = quantidade_consumida + $1,
          quantidade_disponivel = quantidade_inicial - (quantidade_consumida + $1),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [quantidade, saldo.id]);

    const historico = await client.query(`
      INSERT INTO contrato_produtos_modalidades_historico
        (contrato_produto_modalidade_id, quantidade, data_consumo, observacao, usuario_id)
      VALUES ($1, $2, CURRENT_DATE, $3, $4)
      RETURNING id
    `, [saldo.id, quantidade, `Consumo do faturamento ${input.faturamentoId}`, input.usuarioId ?? null]);
    movimentoId = historico.rows[0].id;
  }

  await client.query(`
    UPDATE faturamentos_itens
    SET consumo_registrado = true,
        data_consumo = CURRENT_TIMESTAMP,
        saldo_consumo_modo = $1,
        saldo_consumo_ref_id = $2,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
  `, [config.modulo_principal, movimentoId, item.id]);

  return { changed: true, modo: config.modulo_principal, movimentoId };
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

  if (item.saldo_consumo_modo === "contratos") {
    const historico = await client.query(`
      SELECT id, contrato_produto_saldo_id, quantidade
      FROM contrato_produtos_saldos_historico
      WHERE id = $1
      FOR UPDATE
    `, [item.saldo_consumo_ref_id]);

    if (historico.rows.length === 0) {
      throw new ContratoSaldoError("Movimentacao de saldo por item nao encontrada para estorno");
    }

    const movimento = historico.rows[0];
    await client.query(`
      UPDATE contrato_produtos_saldos
      SET quantidade_consumida = GREATEST(quantidade_consumida - $1, 0),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [movimento.quantidade, movimento.contrato_produto_saldo_id]);
    await client.query("DELETE FROM contrato_produtos_saldos_historico WHERE id = $1", [movimento.id]);
  } else {
    const historico = await client.query(`
      SELECT id, contrato_produto_modalidade_id, quantidade
      FROM contrato_produtos_modalidades_historico
      WHERE id = $1
      FOR UPDATE
    `, [item.saldo_consumo_ref_id]);

    if (historico.rows.length === 0) {
      throw new ContratoSaldoError("Movimentacao de saldo por modalidade nao encontrada para estorno");
    }

    const movimento = historico.rows[0];
    await client.query(`
      UPDATE contrato_produtos_modalidades
      SET quantidade_consumida = GREATEST(quantidade_consumida - $1, 0),
          quantidade_disponivel = quantidade_inicial - GREATEST(quantidade_consumida - $1, 0),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [movimento.quantidade, movimento.contrato_produto_modalidade_id]);
    await client.query("DELETE FROM contrato_produtos_modalidades_historico WHERE id = $1", [movimento.id]);
  }

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
