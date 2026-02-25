import fs from 'fs';
import path from 'path';
import db from '../src/database';

async function run() {
  try {
    const migrationPath = path.resolve(
      __dirname,
      '../migrations/011_add_tenant_to_estoque_tables.sql'
    );
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migração não encontrada em:', migrationPath);
      process.exit(1);
    }
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    console.log('▶️ Executando migração de tenant para estoque...');
    await db.query(sql);
    console.log('✅ Migração aplicada com sucesso.');

    // Validação rápida
    const check = await db.query(`
      SELECT 
        (SELECT TRUE FROM information_schema.columns WHERE table_name='estoque_escolas' AND column_name='tenant_id') AS estoque_escolas_ok,
        (SELECT TRUE FROM information_schema.columns WHERE table_name='estoque_lotes' AND column_name='tenant_id') AS estoque_lotes_ok,
        (SELECT TRUE FROM information_schema.columns WHERE table_name='estoque_escolas_historico' AND column_name='tenant_id') AS historico_ok
    `);
    console.log('🔎 Verificação de colunas:', check.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao aplicar migração:', err);
    process.exit(1);
  }
}

run();

