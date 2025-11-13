const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

// Conexão Neon
const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

// Conexão Local
const localPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/gestaoescolar'
});

async function compareTableStructure(tableName) {
  const neonClient = await neonPool.connect();
  const localClient = await localPool.connect();
  
  try {
    console.log(`\n📋 Comparando tabela: ${tableName}`);
    console.log('='.repeat(80));

    // Buscar colunas do Local
    const localColumns = await localClient.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    // Buscar colunas do Neon
    const neonColumns = await neonClient.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    console.log(`\n📊 LOCAL (${localColumns.rows.length} colunas):`);
    const localColMap = {};
    localColumns.rows.forEach(col => {
      localColMap[col.column_name] = col;
      console.log(`  - ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
    });

    console.log(`\n📊 NEON (${neonColumns.rows.length} colunas):`);
    const neonColMap = {};
    neonColumns.rows.forEach(col => {
      neonColMap[col.column_name] = col;
      console.log(`  - ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
    });

    // Comparar diferenças
    console.log('\n🔍 DIFERENÇAS:');
    let hasDifferences = false;

    // Colunas que existem no Local mas não no Neon
    Object.keys(localColMap).forEach(colName => {
      if (!neonColMap[colName]) {
        console.log(`  ❌ Coluna "${colName}" existe no LOCAL mas NÃO existe no NEON`);
        hasDifferences = true;
      }
    });

    // Colunas que existem no Neon mas não no Local
    Object.keys(neonColMap).forEach(colName => {
      if (!localColMap[colName]) {
        console.log(`  ⚠️  Coluna "${colName}" existe no NEON mas NÃO existe no LOCAL`);
        hasDifferences = true;
      }
    });

    // Colunas com tipos diferentes
    Object.keys(localColMap).forEach(colName => {
      if (neonColMap[colName]) {
        const local = localColMap[colName];
        const neon = neonColMap[colName];
        
        if (local.data_type !== neon.data_type) {
          console.log(`  ⚠️  Coluna "${colName}" tem tipos diferentes:`);
          console.log(`      LOCAL: ${local.data_type}`);
          console.log(`      NEON:  ${neon.data_type}`);
          hasDifferences = true;
        }
        
        if (local.is_nullable !== neon.is_nullable) {
          console.log(`  ⚠️  Coluna "${colName}" tem nullable diferente:`);
          console.log(`      LOCAL: ${local.is_nullable}`);
          console.log(`      NEON:  ${neon.is_nullable}`);
          hasDifferences = true;
        }
      }
    });

    if (!hasDifferences) {
      console.log('  ✅ Estruturas são IDÊNTICAS!');
    }

  } catch (error) {
    console.error(`❌ Erro ao comparar ${tableName}:`, error.message);
  } finally {
    neonClient.release();
    localClient.release();
  }
}

async function compareAllTables() {
  try {
    console.log('🔍 COMPARANDO ESTRUTURA DOS BANCOS DE DADOS');
    console.log('Local: PostgreSQL');
    console.log('Neon: PostgreSQL (Cloud)');
    console.log('='.repeat(80));

    const tables = [
      'usuarios',
      'tenants',
      'institutions',
      'institution_users',
      'tenant_users'
    ];

    for (const table of tables) {
      await compareTableStructure(table);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  } finally {
    await neonPool.end();
    await localPool.end();
  }
}

compareAllTables()
  .then(() => {
    console.log('\n✅ Comparação concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Comparação falhou:', error.message);
    process.exit(1);
  });
