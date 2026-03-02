const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function applyMigration() {
  try {
    console.log('🔧 Aplicando migration de comprovantes (NEON)...\n');

    const sqlPath = path.join(__dirname, '../src/migrations/20260302_create_comprovantes_entrega.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await pool.query(sql);

    console.log('✅ Migration aplicada com sucesso (NEON)!\n');

    // Verificar tabelas criadas
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('comprovantes_entrega', 'comprovante_itens')
      ORDER BY table_name
    `);

    console.log('📋 Tabelas criadas:');
    tables.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Verificar view
    const views = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name = 'vw_comprovantes_completos'
    `);

    if (views.rows.length > 0) {
      console.log('\n📊 View criada:');
      console.log(`   ✓ vw_comprovantes_completos`);
    }

    // Verificar função
    const functions = await pool.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'gerar_numero_comprovante'
    `);

    if (functions.rows.length > 0) {
      console.log('\n⚙️  Função criada:');
      console.log(`   ✓ gerar_numero_comprovante()`);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

applyMigration();
