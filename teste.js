const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require(path.join(__dirname, "backend", "node_modules", "dotenv")).config({
  path: path.join(__dirname, "backend", ".env"),
});

const { Pool } = require(path.join(__dirname, "backend", "node_modules", "pg"));

const connectionString =
  process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("ERRO: NEON_DATABASE_URL, POSTGRES_URL ou DATABASE_URL nao configurada em backend/.env");
  process.exit(1);
}

const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

const CONFIG_KEY = "modulo_saldo_contratos";

async function ensureSchema(client) {
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
    CREATE UNIQUE INDEX IF NOT EXISTS idx_contrato_produtos_modalidades_id_unique
      ON contrato_produtos_modalidades(id)
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
    ALTER TABLE faturamentos_itens
      ADD COLUMN IF NOT EXISTS saldo_consumo_modo VARCHAR(20),
      ADD COLUMN IF NOT EXISTS saldo_consumo_ref_id INTEGER
  `);

  await client.query(`
    INSERT INTO configuracoes_sistema (chave, valor, descricao, tipo, categoria)
    VALUES ($1, $2, 'Configuracao do modo oficial de saldo de contratos', 'json', 'saldos')
    ON CONFLICT (chave) DO NOTHING
  `, [CONFIG_KEY, JSON.stringify({ modulo_principal: "modalidades", mostrar_ambos: false })]);
}

async function testSchema(client) {
  await ensureSchema(client);
  const result = await client.query(`
    SELECT
      to_regclass('public.contrato_produtos_saldos') AS saldos_itens,
      to_regclass('public.contrato_produtos_saldos_historico') AS historico_itens,
      to_regclass('public.contrato_produtos_modalidades_historico') AS historico_modalidades,
      to_regclass('public.comprovante_cancelamentos') AS comprovante_cancelamentos,
      (SELECT valor FROM configuracoes_sistema WHERE chave = $1) AS config
  `, [CONFIG_KEY]);

  const row = result.rows[0];
  assert.equal(row.saldos_itens, "contrato_produtos_saldos");
  assert.equal(row.historico_itens, "contrato_produtos_saldos_historico");
  assert.equal(row.historico_modalidades, "contrato_produtos_modalidades_historico");
  assert.equal(row.comprovante_cancelamentos, "comprovante_cancelamentos");
  assert.ok(JSON.parse(row.config).modulo_principal);

  const comprovanteColumns = await client.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        (table_name = 'comprovantes_entrega' AND column_name IN ('itens_cancelados', 'observacao_cancelamento'))
        OR (table_name = 'comprovante_cancelamentos' AND column_name = 'dados_originais')
      )
  `);
  const columns = new Set(comprovanteColumns.rows.map((item) => `${item.table_name}.${item.column_name}`));
  assert.ok(columns.has("comprovantes_entrega.itens_cancelados"));
  assert.ok(columns.has("comprovantes_entrega.observacao_cancelamento"));
  assert.ok(columns.has("comprovante_cancelamentos.dados_originais"));
  console.log("OK schema/configuracao");
}

async function testConfigRollback(client) {
  await client.query("BEGIN");
  try {
    await client.query(`
      INSERT INTO configuracoes_sistema (chave, valor, descricao, tipo, categoria)
      VALUES ($1, $2, 'Teste rollback', 'json', 'saldos')
      ON CONFLICT (chave) DO UPDATE
        SET valor = EXCLUDED.valor,
            tipo = EXCLUDED.tipo,
            categoria = EXCLUDED.categoria,
            updated_at = CURRENT_TIMESTAMP
    `, [CONFIG_KEY, JSON.stringify({ modulo_principal: "contratos", mostrar_ambos: false })]);

    const updated = await client.query(
      "SELECT valor FROM configuracoes_sistema WHERE chave = $1",
      [CONFIG_KEY]
    );
    assert.equal(JSON.parse(updated.rows[0].valor).modulo_principal, "contratos");
    await client.query("ROLLBACK");
    console.log("OK troca de configuracao com rollback");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}

async function findFaturamentoCandidate(client) {
  const result = await client.query(`
    SELECT
      fi.id AS faturamento_item_id,
      fi.faturamento_pedido_id,
      fi.modalidade_id,
      fi.quantidade_alocada,
      pi.contrato_produto_id
    FROM faturamentos_itens fi
    JOIN pedido_itens pi ON pi.id = fi.pedido_item_id
    WHERE pi.contrato_produto_id IS NOT NULL
      AND fi.modalidade_id IS NOT NULL
      AND COALESCE(fi.quantidade_alocada, 0) > 0
    ORDER BY fi.id DESC
    LIMIT 1
  `);
  return result.rows[0] || null;
}

async function createSyntheticFaturamentoCandidate(client) {
  const base = await client.query(`
    SELECT
      cp.id AS contrato_produto_id,
      cp.produto_id,
      COALESCE(cp.preco_unitario, 1) AS preco_unitario,
      (SELECT id FROM modalidades ORDER BY id LIMIT 1) AS modalidade_id,
      (SELECT id FROM usuarios ORDER BY id LIMIT 1) AS usuario_id
    FROM contrato_produtos cp
    WHERE cp.produto_id IS NOT NULL
    ORDER BY cp.id
    LIMIT 1
  `);

  if (!base.rows[0] || !base.rows[0].modalidade_id || !base.rows[0].usuario_id) {
    return null;
  }

  const row = base.rows[0];
  const quantidade = 2;
  const preco = Number(row.preco_unitario) || 1;
  const numero = `TESTE-SALDO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const pedido = await client.query(`
    INSERT INTO pedidos (numero, usuario_criacao_id, status, created_at, updated_at)
    VALUES ($1, $2, 'pendente', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id
  `, [numero, row.usuario_id]);

  const pedidoItem = await client.query(`
    INSERT INTO pedido_itens
      (pedido_id, contrato_produto_id, produto_id, quantidade, preco_unitario, valor_total, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id
  `, [pedido.rows[0].id, row.contrato_produto_id, row.produto_id, quantidade, preco, quantidade * preco]);

  const faturamento = await client.query(`
    INSERT INTO faturamentos_pedidos (pedido_id, usuario_id, status, created_at, updated_at)
    VALUES ($1, $2, 'gerado', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id
  `, [pedido.rows[0].id, row.usuario_id]);

  const faturamentoItem = await client.query(`
    INSERT INTO faturamentos_itens
      (faturamento_pedido_id, pedido_item_id, modalidade_id, quantidade_alocada, preco_unitario, consumo_registrado, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id
  `, [faturamento.rows[0].id, pedidoItem.rows[0].id, row.modalidade_id, quantidade, preco]);

  return {
    faturamento_item_id: faturamentoItem.rows[0].id,
    faturamento_pedido_id: faturamento.rows[0].id,
    modalidade_id: row.modalidade_id,
    quantidade_alocada: quantidade,
    contrato_produto_id: row.contrato_produto_id,
  };
}

async function getOrCreateFaturamentoCandidate(client) {
  return (await findFaturamentoCandidate(client)) || (await createSyntheticFaturamentoCandidate(client));
}

async function testSaldoPorItem(client) {
  await client.query("BEGIN");
  try {
    const candidate = await getOrCreateFaturamentoCandidate(client);
    assert.ok(candidate, "Nao foi possivel obter/criar item de faturamento para testar saldo por item");

    const quantidade = Number(candidate.quantidade_alocada);
    const inicial = quantidade + 10;
    const saldo = await client.query(`
      INSERT INTO contrato_produtos_saldos
        (contrato_produto_id, quantidade_inicial, quantidade_consumida, ativo, created_at)
      VALUES ($1, $2, 0, true, CURRENT_TIMESTAMP)
      ON CONFLICT (contrato_produto_id) DO UPDATE
        SET quantidade_inicial = EXCLUDED.quantidade_inicial,
            quantidade_consumida = 0,
            ativo = true,
            updated_at = CURRENT_TIMESTAMP
      RETURNING id, quantidade_disponivel
    `, [candidate.contrato_produto_id, inicial]);

    assert.equal(Number(saldo.rows[0].quantidade_disponivel), inicial);

    await client.query(`
      UPDATE contrato_produtos_saldos
      SET quantidade_consumida = quantidade_consumida + $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [quantidade, saldo.rows[0].id]);

    const consumido = await client.query(
      "SELECT quantidade_consumida, quantidade_disponivel FROM contrato_produtos_saldos WHERE id = $1",
      [saldo.rows[0].id]
    );
    assert.equal(Number(consumido.rows[0].quantidade_consumida), quantidade);
    assert.equal(Number(consumido.rows[0].quantidade_disponivel), inicial - quantidade);

    await client.query(`
      UPDATE contrato_produtos_saldos
      SET quantidade_consumida = GREATEST(quantidade_consumida - $1, 0),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [quantidade, saldo.rows[0].id]);

    const estornado = await client.query(
      "SELECT quantidade_consumida, quantidade_disponivel FROM contrato_produtos_saldos WHERE id = $1",
      [saldo.rows[0].id]
    );
    assert.equal(Number(estornado.rows[0].quantidade_consumida), 0);
    assert.equal(Number(estornado.rows[0].quantidade_disponivel), inicial);

    await client.query("ROLLBACK");
    console.log("OK consumo/estorno saldo por item");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}

async function testSaldoPorModalidade(client) {
  await client.query("BEGIN");
  try {
    const candidate = await getOrCreateFaturamentoCandidate(client);
    assert.ok(candidate, "Nao foi possivel obter/criar item de faturamento para testar saldo por modalidade");

    const quantidade = Number(candidate.quantidade_alocada);
    const inicial = quantidade + 10;
    const saldo = await client.query(`
      INSERT INTO contrato_produtos_modalidades
        (contrato_produto_id, modalidade_id, quantidade_inicial, quantidade_consumida, quantidade_disponivel, ativo, created_at)
      VALUES ($1, $2, $3, 0, $3, true, CURRENT_TIMESTAMP)
      ON CONFLICT (contrato_produto_id, modalidade_id) DO UPDATE
        SET quantidade_inicial = EXCLUDED.quantidade_inicial,
            quantidade_consumida = 0,
            quantidade_disponivel = EXCLUDED.quantidade_inicial,
            ativo = true,
            updated_at = CURRENT_TIMESTAMP
      RETURNING id, quantidade_disponivel
    `, [candidate.contrato_produto_id, candidate.modalidade_id, inicial]);

    assert.equal(Number(saldo.rows[0].quantidade_disponivel), inicial);

    await client.query(`
      UPDATE contrato_produtos_modalidades
      SET quantidade_consumida = quantidade_consumida + $1,
          quantidade_disponivel = quantidade_inicial - (quantidade_consumida + $1),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [quantidade, saldo.rows[0].id]);

    const consumido = await client.query(
      "SELECT quantidade_consumida, quantidade_disponivel FROM contrato_produtos_modalidades WHERE id = $1",
      [saldo.rows[0].id]
    );
    assert.equal(Number(consumido.rows[0].quantidade_consumida), quantidade);
    assert.equal(Number(consumido.rows[0].quantidade_disponivel), inicial - quantidade);

    await client.query(`
      UPDATE contrato_produtos_modalidades
      SET quantidade_consumida = GREATEST(quantidade_consumida - $1, 0),
          quantidade_disponivel = quantidade_inicial - GREATEST(quantidade_consumida - $1, 0),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [quantidade, saldo.rows[0].id]);

    const estornado = await client.query(
      "SELECT quantidade_consumida, quantidade_disponivel FROM contrato_produtos_modalidades WHERE id = $1",
      [saldo.rows[0].id]
    );
    assert.equal(Number(estornado.rows[0].quantidade_consumida), 0);
    assert.equal(Number(estornado.rows[0].quantidade_disponivel), inicial);

    await client.query("ROLLBACK");
    console.log("OK consumo/estorno saldo por modalidade");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}

function testCriticalSourceGuards() {
  const saldoController = fs.readFileSync(
    path.join(__dirname, "backend", "src", "modules", "contratos", "controllers", "saldoContratosModalidadesController.ts"),
    "utf8"
  );
  const historicoEntrega = fs.readFileSync(
    path.join(__dirname, "backend", "src", "modules", "entregas", "models", "HistoricoEntrega.ts"),
    "utf8"
  );
  const comprovanteEntrega = fs.readFileSync(
    path.join(__dirname, "backend", "src", "modules", "entregas", "models", "ComprovanteEntrega.ts"),
    "utf8"
  );

  assert.match(saldoController, /registrarConsumoModalidade[\s\S]*db\.transaction[\s\S]*FOR UPDATE[\s\S]*contrato_produtos_modalidades_historico/);
  assert.match(saldoController, /excluirConsumoModalidade[\s\S]*db\.transaction[\s\S]*FOR UPDATE[\s\S]*DELETE FROM contrato_produtos_modalidades_historico/);
  assert.match(historicoEntrega, /async criar[\s\S]*db\.transaction[\s\S]*UPDATE guia_produto_escola/);
  assert.match(historicoEntrega, /async deletar[\s\S]*db\.transaction[\s\S]*FOR UPDATE OF he, gpe[\s\S]*UPDATE guia_produto_escola/);
  assert.match(comprovanteEntrega, /cancelarItemEntrega[\s\S]*db\.transaction[\s\S]*comprovante_cancelamentos[\s\S]*HistoricoEntregaModel\.deletar\(historicoEntregaId, client\)/);
  console.log("OK guardas de codigo transacional");
}

async function testSaldoModalidadeRollback(client) {
  await client.query("BEGIN");
  try {
    const candidate = await getOrCreateFaturamentoCandidate(client);
    assert.ok(candidate, "Nao foi possivel obter/criar item para rollback de saldo por modalidade");

    const saldo = await client.query(`
      INSERT INTO contrato_produtos_modalidades
        (contrato_produto_id, modalidade_id, quantidade_inicial, quantidade_consumida, quantidade_disponivel, ativo, created_at)
      VALUES ($1, $2, 20, 0, 20, true, CURRENT_TIMESTAMP)
      ON CONFLICT (contrato_produto_id, modalidade_id) DO UPDATE
        SET quantidade_inicial = 20,
            quantidade_consumida = 0,
            quantidade_disponivel = 20,
            ativo = true,
            updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [candidate.contrato_produto_id, candidate.modalidade_id]);

    const saldoId = saldo.rows[0].id;
    await client.query("SAVEPOINT saldo_modalidade_falha");
    try {
      await client.query(`
        UPDATE contrato_produtos_modalidades
        SET quantidade_consumida = quantidade_consumida + 5,
            quantidade_disponivel = quantidade_inicial - (quantidade_consumida + 5),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [saldoId]);
      await client.query(`
        INSERT INTO contrato_produtos_modalidades_historico
          (contrato_produto_modalidade_id, quantidade, data_consumo)
        VALUES ($1, NULL, CURRENT_DATE)
      `, [saldoId]);
      assert.fail("Insercao invalida deveria falhar");
    } catch {
      await client.query("ROLLBACK TO SAVEPOINT saldo_modalidade_falha");
    }

    const atual = await client.query(`
      SELECT quantidade_consumida, quantidade_disponivel
      FROM contrato_produtos_modalidades
      WHERE id = $1
    `, [saldoId]);
    assert.equal(Number(atual.rows[0].quantidade_consumida), 0);
    assert.equal(Number(atual.rows[0].quantidade_disponivel), 20);

    await client.query("ROLLBACK");
    console.log("OK rollback atomico saldo por modalidade");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}

async function testHistoricoEntregaRollback(client) {
  const item = await client.query(`
    SELECT id, quantidade_total_entregue, entrega_confirmada, status
    FROM guia_produto_escola
    ORDER BY id
    LIMIT 1
  `);

  if (item.rows.length === 0) {
    console.log("AVISO sem guia_produto_escola para testar rollback de historico de entrega");
    return;
  }

  const itemId = item.rows[0].id;
  const original = item.rows[0];
  await client.query("BEGIN");
  try {
    await client.query(`
      INSERT INTO historico_entregas (
        guia_produto_escola_id,
        quantidade_entregue,
        nome_quem_entregou,
        nome_quem_recebeu
      ) VALUES ($1, 1, 'Teste rollback', 'Teste rollback')
    `, [itemId]);

    await client.query(`
      UPDATE guia_produto_escola
      SET quantidade_total_entregue = COALESCE(quantidade_total_entregue, 0) + 1,
          updated_at = NOW()
      WHERE id = $1
    `, [itemId]);

    await client.query("ROLLBACK");
    const atual = await client.query(`
      SELECT quantidade_total_entregue, entrega_confirmada, status
      FROM guia_produto_escola
      WHERE id = $1
    `, [itemId]);

    assert.equal(Number(atual.rows[0].quantidade_total_entregue || 0), Number(original.quantidade_total_entregue || 0));
    assert.equal(Boolean(atual.rows[0].entrega_confirmada), Boolean(original.entrega_confirmada));
    assert.equal(atual.rows[0].status, original.status);
    console.log("OK rollback atomico historico de entrega");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}

async function testPnaeDashboardQuery(client) {
  const periodo = await client.query("SELECT id FROM periodos WHERE ativo = true ORDER BY ano DESC LIMIT 1");
  if (periodo.rows.length === 0) {
    console.log("AVISO sem periodo ativo para testar dashboard PNAE");
    return;
  }

  const result = await client.query(`
    WITH meses_ordenados AS (
      SELECT
        CAST(SPLIT_PART(v.competencia_mes_ano, '-', 2) AS INTEGER) as mes,
        CASE CAST(SPLIT_PART(v.competencia_mes_ano, '-', 2) AS INTEGER)
          WHEN 1 THEN 'Jan/' || SPLIT_PART(v.competencia_mes_ano, '-', 1)
          WHEN 2 THEN 'Fev/' || SPLIT_PART(v.competencia_mes_ano, '-', 1)
          WHEN 3 THEN 'Mar/' || SPLIT_PART(v.competencia_mes_ano, '-', 1)
          WHEN 4 THEN 'Abr/' || SPLIT_PART(v.competencia_mes_ano, '-', 1)
          WHEN 5 THEN 'Mai/' || SPLIT_PART(v.competencia_mes_ano, '-', 1)
          WHEN 6 THEN 'Jun/' || SPLIT_PART(v.competencia_mes_ano, '-', 1)
          WHEN 7 THEN 'Jul/' || SPLIT_PART(v.competencia_mes_ano, '-', 1)
          WHEN 8 THEN 'Ago/' || SPLIT_PART(v.competencia_mes_ano, '-', 1)
          WHEN 9 THEN 'Set/' || SPLIT_PART(v.competencia_mes_ano, '-', 1)
          WHEN 10 THEN 'Out/' || SPLIT_PART(v.competencia_mes_ano, '-', 1)
          WHEN 11 THEN 'Nov/' || SPLIT_PART(v.competencia_mes_ano, '-', 1)
          WHEN 12 THEN 'Dez/' || SPLIT_PART(v.competencia_mes_ano, '-', 1)
        END as mes_nome,
        SUM(valor_itens) as valor_total,
        SUM(valor_agricultura_familiar) as valor_af
      FROM vw_pnae_agricultura_familiar v
      JOIN pedidos p ON p.id = v.pedido_id
      WHERE p.periodo_id = $1
      GROUP BY v.competencia_mes_ano, CAST(SPLIT_PART(v.competencia_mes_ano, '-', 2) AS INTEGER)
    )
    SELECT
      mes,
      mes_nome,
      SUM(valor_total) OVER (ORDER BY mes) as valor_total_acumulado,
      SUM(valor_af) OVER (ORDER BY mes) as valor_af_acumulado,
      valor_total as valor_total_mes,
      valor_af as valor_af_mes
    FROM meses_ordenados
    ORDER BY mes
  `, [periodo.rows[0].id]);

  assert.ok(Array.isArray(result.rows));
  console.log("OK dashboard PNAE evolucao mensal");
}

async function main() {
  const client = await pool.connect();
  try {
    console.log("Banco:", isLocal ? "local" : "Neon");
    testCriticalSourceGuards();
    await testSchema(client);
    await testConfigRollback(client);
    await testSaldoPorItem(client);
    await testSaldoPorModalidade(client);
    await testSaldoModalidadeRollback(client);
    await testHistoricoEntregaRollback(client);
    await testPnaeDashboardQuery(client);
    console.log("OK teste.js finalizado");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(async (error) => {
  await pool.end().catch(() => {});
  console.error("FALHOU:", error && error.message ? error.message : error);
  if (error && error.code) console.error("CODIGO:", error.code);
  if (error && error.detail) console.error("DETALHE:", error.detail);
  if (error && error.stack) console.error(error.stack);
  process.exit(1);
});
