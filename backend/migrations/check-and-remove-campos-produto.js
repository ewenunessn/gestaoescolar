/**
 * Remove marca, peso e unidade da tabela produtos no Neon
 * Esses campos agora vivem em contrato_produtos
 */
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    // 1. Ver colunas atuais
    const cols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'produtos' 
      ORDER BY ordinal_position
    `);
    console.log('Colunas atuais em produtos:');
    cols.rows.forEach(c => console.log(' -', c.column_name, '(' + c.data_type + ')'));

    const colNames = cols.rows.map(r => r.column_name);
    const toRemove = ['marca', 'peso', 'unidade'].filter(c => colNames.includes(c));

    if (toRemove.length === 0) {
      console.log('\n✅ Nenhuma coluna para remover (já foram removidas).');
      return;
    }

    console.log('\n🗑️  Removendo:', toRemove.join(', '));

    for (const col of toRemove) {
      try {
        await pool.query(`ALTER TABLE produtos DROP COLUMN IF EXISTS ${col} CASCADE`);
        console.log(`  ✅ ${col} removida`);
      } catch (err) {
        console.error(`  ❌ Erro ao remover ${col}:`, err.message);
      }
    }

    // 2. Confirmar
    const after = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'produtos' ORDER BY ordinal_position
    `);
    console.log('\nColunas restantes:', after.rows.map(r => r.column_name).join(', '));
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
