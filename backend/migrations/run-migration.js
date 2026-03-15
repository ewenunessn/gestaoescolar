#!/usr/bin/env node
/**
 * Roda a migration 20260315_fix_produtos_cascade_delete.sql
 * nos dois bancos: local e Neon (produção)
 *
 * Executa statement por statement para não abortar tudo em caso de erro pontual.
 * Limpa órfãos antes de recriar FKs para evitar violações.
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const SQL_FILE = path.join(__dirname, '20260315_fix_produtos_cascade_delete.sql');
const rawSql = fs.readFileSync(SQL_FILE, 'utf8');

// Divide em statements individuais ignorando comentários e linhas vazias
const statements = rawSql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

const DATABASES = [
  {
    label: 'LOCAL (localhost)',
    connectionString: 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar',
    ssl: false,
  },
  {
    label: 'NEON (produção)',
    connectionString:
      'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false },
  },
];

// Tabelas que referenciam produtos(id) — limpa órfãos antes de recriar FK
const TABELAS_COM_PRODUTO_ID = [
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

async function limparOrfaos(client) {
  console.log('  → Limpando registros órfãos...');
  for (const tabela of TABELAS_COM_PRODUTO_ID) {
    const check = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = $1 AND column_name = 'produto_id'
      )
    `, [tabela]);
    if (!check.rows[0].exists) continue;

    const result = await client.query(
      `DELETE FROM ${tabela} WHERE produto_id IS NOT NULL AND produto_id NOT IN (SELECT id FROM produtos)`,
    );
    if (result.rowCount > 0) {
      console.log(`    [ORFAO] ${tabela} — ${result.rowCount} removido(s)`);
    }
  }

  // Limpa órfãos em estoque_central_movimentacoes (referencia estoque_central.id)
  const hasCm = await client.query(`
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estoque_central_movimentacoes')
  `);
  if (hasCm.rows[0].exists) {
    const r = await client.query(`
      DELETE FROM estoque_central_movimentacoes
      WHERE estoque_central_id NOT IN (SELECT id FROM estoque_central)
    `);
    if (r.rowCount > 0) {
      console.log(`    [ORFAO] estoque_central_movimentacoes — ${r.rowCount} removido(s)`);
    }
  }
}

async function runMigration({ label, connectionString, ssl }) {
  const client = new Client({ connectionString, ssl });
  console.log(`\n▶ Conectando em: ${label}`);
  try {
    await client.connect();
    console.log('  ✓ Conectado');

    await limparOrfaos(client);

    let ok = 0, skip = 0, erros = 0;
    for (const stmt of statements) {
      try {
        await client.query(stmt);
        ok++;
      } catch (err) {
        // Tabela não existe = skip esperado
        if (err.code === '42P01' || err.message.includes('does not exist')) {
          skip++;
        } else {
          console.error(`  ✗ ${err.message.split('\n')[0]}`);
          console.error(`    SQL: ${stmt.substring(0, 80)}...`);
          erros++;
        }
      }
    }
    console.log(`  ✓ Concluído — ${ok} ok, ${skip} skip (tabela inexistente), ${erros} erro(s)`);
  } catch (err) {
    console.error(`  ✗ Erro fatal: ${err.message}`);
  } finally {
    await client.end();
  }
}

(async () => {
  console.log('=== Migration: fix_produtos_cascade_delete ===');
  for (const db of DATABASES) {
    await runMigration(db);
  }
  console.log('\n=== Concluído ===');
})();
