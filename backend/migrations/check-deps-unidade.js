const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    // Verificar o que depende da coluna unidade de produtos
    const deps = await pool.query(`
      SELECT 
        dependent_ns.nspname as schema,
        dependent_view.relname as view_name,
        dependent_view.relkind
      FROM pg_depend 
      JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid 
      JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid 
      JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid 
      JOIN pg_attribute ON pg_depend.refobjid = pg_attribute.attrelid 
        AND pg_depend.refobjsubid = pg_attribute.attnum 
      JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_view.relnamespace
      WHERE source_table.relname = 'produtos'
        AND pg_attribute.attname = 'unidade'
    `);
    console.log('Dependências de produtos.unidade:');
    if (deps.rows.length === 0) {
      console.log('  Nenhuma dependência encontrada via pg_depend');
    } else {
      deps.rows.forEach(r => console.log(' -', r.schema + '.' + r.view_name, '(tipo:', r.relkind + ')'));
    }

    // Verificar views que mencionam produtos
    const views = await pool.query(`
      SELECT table_name, view_definition 
      FROM information_schema.views 
      WHERE table_schema = 'public'
    `);
    console.log('\nViews existentes:');
    if (views.rows.length === 0) {
      console.log('  Nenhuma view');
    } else {
      views.rows.forEach(v => {
        if (v.view_definition && v.view_definition.includes('produtos')) {
          console.log(' -', v.table_name, '(menciona produtos)');
        } else {
          console.log(' -', v.table_name);
        }
      });
    }
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await pool.end();
  }
}
main();
