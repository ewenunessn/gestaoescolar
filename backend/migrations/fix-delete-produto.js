#!/usr/bin/env node
/**
 * Fix: deleta produto_id = 7 limpando todas as tabelas dependentes primeiro
 * Roda nos dois bancos: local e Neon
 */

const { Client } = require('pg');

const PRODUTO_ID = 39;

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

// Tabelas dependentes em ordem segura (filhas antes das mães)
const TABELAS_DEPENDENTES = [
  'estoque_escolas_historico',
  'estoque_movimentacoes',
  'estoque_escolar_movimentacoes',
  'estoque_lotes',
  'estoque_central_movimentacoes', // FK para estoque_central, deve vir antes
  'estoque_central',
  'estoque_escolas',
  'estoque_escola',
  'estoque_alertas',
  'guia_produto_escola',
  'faturamento_itens',
  'pedido_itens',
  'refeicao_produtos',
  'refeicoes_ingredientes',
  'produto_composicao_nutricional',
  'produto_modalidades',
  'demandas',
  'controle_qualidade',
  'contrato_produtos',
];

async function fixDelete({ label, connectionString, ssl }) {
  const client = new Client({ connectionString, ssl });
  console.log(`\n▶ ${label}`);
  try {
    await client.connect();
    await client.query('BEGIN');

    for (const tabela of TABELAS_DEPENDENTES) {
      // Caso especial: estoque_central_movimentacoes referencia estoque_central.id, não produto_id
      if (tabela === 'estoque_central_movimentacoes') {
        const checkTable = await client.query(`
          SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)
        `, [tabela]);
        if (!checkTable.rows[0].exists) {
          console.log(`  [SKIP] ${tabela}`);
          continue;
        }
        const result = await client.query(
          `DELETE FROM estoque_central_movimentacoes
           WHERE estoque_central_id IN (
             SELECT id FROM estoque_central WHERE produto_id = $1
           )`,
          [PRODUTO_ID]
        );
        console.log(`  [DEL]  ${tabela} — ${result.rowCount} linha(s) removida(s)`);
        continue;
      }

      // Verifica se tabela existe e tem coluna produto_id
      const check = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = $1 AND column_name = 'produto_id'
        )
      `, [tabela]);

      if (!check.rows[0].exists) {
        console.log(`  [SKIP] ${tabela}`);
        continue;
      }

      const result = await client.query(
        `DELETE FROM ${tabela} WHERE produto_id = $1`,
        [PRODUTO_ID]
      );
      console.log(`  [DEL]  ${tabela} — ${result.rowCount} linha(s) removida(s)`);
    }

    // Agora deleta o produto
    const del = await client.query('DELETE FROM produtos WHERE id = $1', [PRODUTO_ID]);
    console.log(`  [DEL]  produtos — ${del.rowCount} linha(s) removida(s)`);

    await client.query('COMMIT');
    console.log('  ✓ Concluído com sucesso');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`  ✗ Erro (rollback): ${err.message}`);
  } finally {
    await client.end();
  }
}

(async () => {
  console.log(`=== Fix: deletar produto id=${PRODUTO_ID} ===`);
  for (const db of DATABASES) {
    await fixDelete(db);
  }
  console.log('\n=== Concluído ===');
})();
