const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkEnvironment(name, connectionString, ssl) {
  const pool = new Pool({
    connectionString,
    ssl
  });

  try {
    console.log(`\n🔍 Verificando ${name}...\n`);

    // Verificar se a coluna data_entrega existe
    const columnCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'guia_produto_escola'
        AND column_name = 'data_entrega'
    `);

    if (columnCheck.rows.length > 0) {
      console.log(`✅ Coluna 'data_entrega' existe`);
      console.log(`   Tipo: ${columnCheck.rows[0].data_type}`);
      console.log(`   Nullable: ${columnCheck.rows[0].is_nullable}`);
    } else {
      console.log(`❌ Coluna 'data_entrega' NÃO existe`);
    }

    // Verificar se a view existe
    const viewCheck = await pool.query(`
      SELECT COUNT(*) as total
      FROM information_schema.views
      WHERE table_name = 'vw_entregas_programadas'
    `);

    if (viewCheck.rows[0].total > 0) {
      console.log(`✅ View 'vw_entregas_programadas' existe`);
    } else {
      console.log(`❌ View 'vw_entregas_programadas' NÃO existe`);
    }

    // Verificar índice
    const indexCheck = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'guia_produto_escola'
        AND indexname = 'idx_guia_produto_escola_data_entrega'
    `);

    if (indexCheck.rows.length > 0) {
      console.log(`✅ Índice 'idx_guia_produto_escola_data_entrega' existe`);
    } else {
      console.log(`❌ Índice 'idx_guia_produto_escola_data_entrega' NÃO existe`);
    }

    // Contar registros com data_entrega
    const dataCheck = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(data_entrega) as com_data,
        COUNT(*) - COUNT(data_entrega) as sem_data
      FROM guia_produto_escola
    `);

    console.log(`\n📊 Estatísticas:`);
    console.log(`   Total de registros: ${dataCheck.rows[0].total}`);
    console.log(`   Com data_entrega: ${dataCheck.rows[0].com_data}`);
    console.log(`   Sem data_entrega: ${dataCheck.rows[0].sem_data}`);

    // Verificar entregas antecipadas (se a view existir)
    if (viewCheck.rows[0].total > 0) {
      const antecipadas = await pool.query(`
        SELECT COUNT(*) as total
        FROM vw_entregas_programadas
        WHERE entrega_antecipada = true
      `);
      console.log(`   Entregas antecipadas: ${antecipadas.rows[0].total}`);
    }

    console.log(`\n✅ ${name} está configurado corretamente!\n`);
    console.log('─'.repeat(80));

  } catch (error) {
    console.error(`\n❌ Erro ao verificar ${name}:`, error.message);
    console.log('─'.repeat(80));
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log('═'.repeat(80));
  console.log('  STATUS DA MIGRATION DE COMPETÊNCIA');
  console.log('═'.repeat(80));

  // Verificar ambiente local
  await checkEnvironment(
    'LOCAL (PostgreSQL)',
    process.env.DATABASE_URL,
    false
  );

  // Verificar ambiente Vercel (Neon)
  await checkEnvironment(
    'VERCEL (Neon)',
    process.env.POSTGRES_URL,
    { rejectUnauthorized: false }
  );

  console.log('\n💡 Resumo:');
  console.log('   A migration adiciona:');
  console.log('   1. Coluna data_entrega (quando entregar fisicamente)');
  console.log('   2. View vw_entregas_programadas (consultas facilitadas)');
  console.log('   3. Índice para performance');
  console.log('   4. Separação entre competência (guia) e data de entrega\n');
}

main();
