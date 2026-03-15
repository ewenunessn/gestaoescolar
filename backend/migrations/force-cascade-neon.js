const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

// Cada FK que precisa virar CASCADE
const FKS = [
  { table: 'estoque_central',           constraint: 'estoque_central_produto_id_fkey',           col: 'produto_id', ref: 'produtos(id)' },
  { table: 'estoque_lotes',             constraint: 'estoque_lotes_produto_id_fkey',             col: 'produto_id', ref: 'produtos(id)' },
  { table: 'estoque_movimentacoes',     constraint: 'estoque_movimentacoes_produto_id_fkey',     col: 'produto_id', ref: 'produtos(id)' },
  { table: 'estoque_escolas',           constraint: 'estoque_escolas_produto_id_fkey',           col: 'produto_id', ref: 'produtos(id)' },
  { table: 'estoque_escolas_historico', constraint: 'estoque_escolas_historico_produto_id_fkey', col: 'produto_id', ref: 'produtos(id)' },
  { table: 'guia_produto_escola',       constraint: 'guia_produto_escola_produto_id_fkey',       col: 'produto_id', ref: 'produtos(id)' },
  { table: 'faturamento_itens',         constraint: 'faturamento_itens_produto_id_fkey',         col: 'produto_id', ref: 'produtos(id)' },
  { table: 'pedido_itens',              constraint: 'pedido_itens_produto_id_fkey',              col: 'produto_id', ref: 'produtos(id)' },
  { table: 'contrato_produtos',         constraint: 'contrato_produtos_produto_id_fkey',         col: 'produto_id', ref: 'produtos(id)' },
  { table: 'refeicao_produtos',         constraint: 'refeicao_produtos_produto_id_fkey',         col: 'produto_id', ref: 'produtos(id)' },
  { table: 'produto_composicao_nutricional', constraint: 'produto_composicao_nutricional_produto_id_fkey', col: 'produto_id', ref: 'produtos(id)' },
  { table: 'refeicoes_ingredientes',    constraint: 'refeicoes_ingredientes_produto_id_fkey',    col: 'produto_id', ref: 'produtos(id)' },
  { table: 'produto_modalidades',       constraint: 'produto_modalidades_produto_id_fkey',       col: 'produto_id', ref: 'produtos(id)' },
  // FK que referencia estoque_central.id (não produto_id) — precisa CASCADE para não bloquear delete de produto
  { table: 'estoque_central_movimentacoes', constraint: 'estoque_central_movimentacoes_estoque_central_id_fkey', col: 'estoque_central_id', ref: 'estoque_central(id)' },
];

async function run() {
  await client.connect();
  console.log('=== Forçando CASCADE nas FKs (NEON) ===\n');

  for (const fk of FKS) {
    try {
      // 1. Limpa órfãos para não bloquear o ADD
      // Para estoque_central_movimentacoes, limpa baseado em estoque_central.id
      if (fk.col === 'estoque_central_id') {
        const del = await client.query(
          `DELETE FROM ${fk.table} WHERE ${fk.col} IS NOT NULL AND ${fk.col} NOT IN (SELECT id FROM estoque_central)`
        );
        if (del.rowCount > 0) console.log(`  [ORFAO] ${fk.table} — ${del.rowCount} removido(s)`);
      } else {
        const del = await client.query(
          `DELETE FROM ${fk.table} WHERE ${fk.col} IS NOT NULL AND ${fk.col} NOT IN (SELECT id FROM produtos)`
        );
        if (del.rowCount > 0) console.log(`  [ORFAO] ${fk.table} — ${del.rowCount} removido(s)`);
      }

      // 2. Descobre o nome real da constraint atual (pode ter nome diferente)
      const existing = await client.query(`
        SELECT rc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = $1 AND kcu.column_name = $2 AND tc.constraint_type = 'FOREIGN KEY'
      `, [fk.table, fk.col]);

      for (const row of existing.rows) {
        await client.query(`ALTER TABLE ${fk.table} DROP CONSTRAINT "${row.constraint_name}"`);
        console.log(`  [DROP] ${fk.table}.${row.constraint_name}`);
      }

      // 3. Recria com CASCADE
      await client.query(`
        ALTER TABLE ${fk.table} ADD CONSTRAINT ${fk.constraint}
        FOREIGN KEY (${fk.col}) REFERENCES ${fk.ref} ON DELETE CASCADE
      `);
      console.log(`  [OK]   ${fk.table}.${fk.constraint} → CASCADE`);
    } catch (err) {
      console.error(`  [ERR]  ${fk.table}: ${err.message.split('\n')[0]}`);
    }
  }

  await client.end();
  console.log('\n=== Concluído ===');
}

run().catch(e => { console.error(e.message); client.end(); });
