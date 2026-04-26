#!/usr/bin/env node
/**
 * Diagnóstico: verifica dados órfãos e erros de FK antes de rodar a migration
 */

const { Client } = require('pg');

const DATABASES = [
  {
    label: 'LOCAL (localhost)',
    connectionString: 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar',
    ssl: false,
  },
  {
    label: 'NEON (produção)',
    connectionString:
      process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || '',
    ssl: { rejectUnauthorized: false },
  },
];

// Tabelas que referenciam produtos(id)
const TABELAS = [
  'estoque_central',
  'estoque_lotes',
  'estoque_movimentacoes',
  'estoque_escolas',
  'estoque_escolas_historico',
  'guia_produto_escola',
  'faturamento_itens',
  'pedido_itens',
  'contrato_produtos',
  'refeicao_produtos',
  'produto_composicao_nutricional',
  'demandas',
  'produto_modalidades',
  'refeicoes_ingredientes',
  'controle_qualidade',
  'estoque_alertas',
  'estoque_escola',
  'estoque_escolar_movimentacoes',
];

async function diagnose({ label, connectionString, ssl }) {
  const client = new Client({ connectionString, ssl });
  console.log(`\n▶ ${label}`);
  try {
    await client.connect();

    for (const tabela of TABELAS) {
      // Verifica se a tabela existe
      const exists = await client.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)`,
        [tabela]
      );
      if (!exists.rows[0].exists) {
        console.log(`  [SKIP] ${tabela} — não existe`);
        continue;
      }

      // Verifica se tem coluna produto_id
      const hasCol = await client.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'produto_id')`,
        [tabela]
      );
      if (!hasCol.rows[0].exists) {
        console.log(`  [SKIP] ${tabela} — sem coluna produto_id`);
        continue;
      }

      // Conta órfãos
      const orphans = await client.query(
        `SELECT COUNT(*) FROM ${tabela} WHERE produto_id IS NOT NULL AND produto_id NOT IN (SELECT id FROM produtos)`
      );
      const count = parseInt(orphans.rows[0].count);
      if (count > 0) {
        console.log(`  [ORFAO] ${tabela} — ${count} registro(s) órfão(s)`);
        // Mostra os IDs órfãos
        const ids = await client.query(
          `SELECT DISTINCT produto_id FROM ${tabela} WHERE produto_id IS NOT NULL AND produto_id NOT IN (SELECT id FROM produtos) LIMIT 10`
        );
        console.log(`         produto_ids: ${ids.rows.map(r => r.produto_id).join(', ')}`);
      } else {
        console.log(`  [OK]   ${tabela}`);
      }
    }
  } catch (err) {
    console.error(`  ✗ Erro: ${err.message}`);
  } finally {
    await client.end();
  }
}

(async () => {
  console.log('=== Diagnóstico de órfãos antes da migration ===');
  for (const db of DATABASES) {
    await diagnose(db);
  }
  console.log('\n=== Concluído ===');
})();
