const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;

function normalizeConnectionStringSsl(value) {
  const isLocal = value.includes('localhost') || value.includes('127.0.0.1');
  if (isLocal) return value;

  const url = new URL(value);
  const sslmode = url.searchParams.get('sslmode');
  if (!sslmode || ['prefer', 'require', 'verify-ca'].includes(sslmode)) {
    url.searchParams.set('sslmode', 'verify-full');
  }
  return url.toString();
}

const importantTables = [
  'escolas',
  'modalidades',
  'escola_modalidades',
  'escola_modalidades_historico',
  'escolas_modalidades',
  'cardapios',
  'cardapios_modalidade',
  'cardapio_modalidades',
  'cardapio_refeicoes',
  'cardapio_refeicoes_dia',
  'produtos',
  'contratos',
  'contrato_produtos',
  'contrato_produtos_modalidades',
  'guias',
  'guia_produto_escola',
  'estoque_escola',
  'estoque_escolas',
  'estoque_movimentacoes',
  'estoque_escolar_movimentacoes',
  'pedidos',
  'pedido_itens',
  'pedidos_itens',
  'faturamentos',
  'faturamento_itens',
  'faturamentos_itens',
  'instituicoes',
  'institutions',
  'usuarios',
];

const importantViews = [
  'vw_faturamentos_detalhados',
  'vw_faturamentos_resumo_modalidades',
  'vw_faturamento_tipo_fornecedor_modalidade',
  'vw_pedido_resumo_tipo_fornecedor',
];

async function tableExists(client, table) {
  const { rows } = await client.query('SELECT to_regclass($1) AS name', [`public.${table}`]);
  return Boolean(rows[0].name);
}

async function countRows(client, table) {
  const exists = await tableExists(client, table);
  if (!exists) return { table, exists: false, rows: null };
  const { rows } = await client.query(`SELECT COUNT(*)::int AS total FROM "${table}"`);
  return { table, exists: true, rows: rows[0].total };
}

async function safeScalar(client, name, sql) {
  try {
    const { rows } = await client.query(sql);
    return { name, ok: true, rows };
  } catch (error) {
    return { name, ok: false, error: error.message };
  }
}

async function main() {
  if (!connectionString) {
    throw new Error('NEON_DATABASE_URL, POSTGRES_URL ou DATABASE_URL nao configurada no backend/.env.');
  }

  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const pool = new Pool({
    connectionString: normalizeConnectionStringSsl(connectionString),
    ssl: isLocal ? false : { rejectUnauthorized: true },
  });

  const client = await pool.connect();
  try {
    const tableCounts = [];
    for (const table of importantTables) {
      tableCounts.push(await countRows(client, table));
    }

    const viewChecks = [];
    for (const view of importantViews) {
      viewChecks.push({ view, exists: await tableExists(client, view) });
    }

    const constraints = await client.query(`
      SELECT
        t.relname AS table_name,
        c.conname,
        c.contype,
        pg_get_constraintdef(c.oid) AS definition
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = ANY($1)
      ORDER BY t.relname, c.contype, c.conname
    `, [[
      'escola_modalidades',
      'escola_modalidades_historico',
      'escolas_modalidades',
      'cardapio_modalidades',
      'contrato_produtos_modalidades',
      'rota_escolas',
    ]]);

    const indexes = await client.query(`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = ANY($1)
      ORDER BY tablename, indexname
    `, [[
      'escola_modalidades',
      'escola_modalidades_historico',
      'escolas_modalidades',
      'cardapio_modalidades',
      'contrato_produtos_modalidades',
    ]]);

    const columns = await client.query(`
      SELECT
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ANY($1)
      ORDER BY table_name, ordinal_position
    `, [[
      'escola_modalidades',
      'contrato_produtos_modalidades',
      'faturamentos_pedidos',
      'faturamentos_itens',
      'pedidos',
      'vw_faturamentos_detalhados',
      'vw_faturamentos_resumo_modalidades',
      'vw_faturamento_tipo_fornecedor_modalidade',
    ]]);

    const checks = [];
    checks.push(await safeScalar(client, 'orfaos_escola_modalidades', `
      SELECT COUNT(*)::int AS total
      FROM escola_modalidades em
      LEFT JOIN escolas e ON e.id = em.escola_id
      LEFT JOIN modalidades m ON m.id = em.modalidade_id
      WHERE e.id IS NULL OR m.id IS NULL
    `));
    checks.push(await safeScalar(client, 'duplicados_escola_modalidades', `
      SELECT escola_id, modalidade_id, COUNT(*)::int AS total
      FROM escola_modalidades
      GROUP BY escola_id, modalidade_id
      HAVING COUNT(*) > 1
      ORDER BY total DESC
      LIMIT 20
    `));
    checks.push(await safeScalar(client, 'orfaos_cardapio_modalidades', `
      SELECT COUNT(*)::int AS total
      FROM cardapio_modalidades cm
      LEFT JOIN cardapios_modalidade c ON c.id = cm.cardapio_id
      LEFT JOIN modalidades m ON m.id = cm.modalidade_id
      WHERE c.id IS NULL OR m.id IS NULL
    `));
    checks.push(await safeScalar(client, 'orfaos_contrato_produtos_modalidades', `
      SELECT COUNT(*)::int AS total
      FROM contrato_produtos_modalidades cpm
      LEFT JOIN contrato_produtos cp ON cp.id = cpm.contrato_produto_id
      LEFT JOIN modalidades m ON m.id = cpm.modalidade_id
      WHERE cp.id IS NULL OR m.id IS NULL
    `));
    checks.push(await safeScalar(client, 'orfaos_guia_produto_escola', `
      SELECT COUNT(*)::int AS total
      FROM guia_produto_escola gpe
      LEFT JOIN guias g ON g.id = gpe.guia_id
      LEFT JOIN produtos p ON p.id = gpe.produto_id
      LEFT JOIN escolas e ON e.id = gpe.escola_id
      WHERE g.id IS NULL OR p.id IS NULL OR e.id IS NULL
    `));

    const realTables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log(JSON.stringify({
      ok: true,
      generated_at: new Date().toISOString(),
      table_counts: tableCounts,
      views: viewChecks,
      constraints: constraints.rows,
      indexes: indexes.rows,
      columns: columns.rows,
      checks,
      public_table_count: realTables.rows.length,
      public_tables: realTables.rows.map((row) => row.table_name),
    }, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error.message || String(error),
    code: error.code,
    stack: error.stack,
  }, null, 2));
  process.exit(1);
});
