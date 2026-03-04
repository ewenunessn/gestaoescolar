/**
 * Script para comparar estrutura de pedido_itens entre LOCAL e NEON
 */

const { Pool } = require('pg');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function compareStructures() {
  console.log('\n🔍 Comparando estrutura de pedido_itens...\n');

  // Conectar ao LOCAL
  const localPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });

  // Conectar ao NEON
  const neonPool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const localClient = await localPool.connect();
    const neonClient = await neonPool.connect();

    console.log('📊 BANCO LOCAL:');
    const localColumns = await localClient.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'pedido_itens'
      ORDER BY ordinal_position
    `);

    for (const col of localColumns.rows) {
      console.log(`  - ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    }

    console.log('\n📊 BANCO NEON:');
    const neonColumns = await neonClient.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'pedido_itens'
      ORDER BY ordinal_position
    `);

    for (const col of neonColumns.rows) {
      console.log(`  - ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    }

    // Comparar diferenças
    console.log('\n🔄 DIFERENÇAS:');
    const localColNames = localColumns.rows.map(c => c.column_name);
    const neonColNames = neonColumns.rows.map(c => c.column_name);

    const onlyInLocal = localColNames.filter(c => !neonColNames.includes(c));
    const onlyInNeon = neonColNames.filter(c => !localColNames.includes(c));

    if (onlyInLocal.length > 0) {
      console.log('  ⚠️  Colunas apenas no LOCAL:', onlyInLocal.join(', '));
    }

    if (onlyInNeon.length > 0) {
      console.log('  ⚠️  Colunas apenas no NEON:', onlyInNeon.join(', '));
    }

    if (onlyInLocal.length === 0 && onlyInNeon.length === 0) {
      console.log('  ✅ Mesmas colunas em ambos os bancos');
    }

    // Verificar constraints
    console.log('\n🔗 CONSTRAINTS LOCAL:');
    const localConstraints = await localClient.query(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      LEFT JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'pedido_itens'
      ORDER BY tc.constraint_type, tc.constraint_name
    `);

    for (const c of localConstraints.rows) {
      if (c.constraint_type === 'FOREIGN KEY') {
        console.log(`  - FK: ${c.column_name} -> ${c.foreign_table_name}(${c.foreign_column_name})`);
      } else {
        console.log(`  - ${c.constraint_type}: ${c.constraint_name}`);
      }
    }

    console.log('\n🔗 CONSTRAINTS NEON:');
    const neonConstraints = await neonClient.query(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      LEFT JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'pedido_itens'
      ORDER BY tc.constraint_type, tc.constraint_name
    `);

    for (const c of neonConstraints.rows) {
      if (c.constraint_type === 'FOREIGN KEY') {
        console.log(`  - FK: ${c.column_name} -> ${c.foreign_table_name}(${c.foreign_column_name})`);
      } else {
        console.log(`  - ${c.constraint_type}: ${c.constraint_name}`);
      }
    }

    // Verificar índices
    console.log('\n📇 ÍNDICES LOCAL:');
    const localIndexes = await localClient.query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'pedido_itens'
      ORDER BY indexname
    `);

    for (const idx of localIndexes.rows) {
      console.log(`  - ${idx.indexname}`);
    }

    console.log('\n📇 ÍNDICES NEON:');
    const neonIndexes = await neonClient.query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'pedido_itens'
      ORDER BY indexname
    `);

    for (const idx of neonIndexes.rows) {
      console.log(`  - ${idx.indexname}`);
    }

    localClient.release();
    neonClient.release();

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await localPool.end();
    await neonPool.end();
  }
}

compareStructures()
  .then(() => {
    console.log('\n🎉 Comparação concluída!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Erro fatal:', error.message);
    process.exit(1);
  });
