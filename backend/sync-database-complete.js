const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Configuração dos dois bancos
const localPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

const neonPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function syncDatabase(pool, dbName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔄 Sincronizando: ${dbName}`);
  console.log('='.repeat(60));

  try {
    // 1. Verificar e adicionar campo fator_correcao
    console.log('\n📋 Verificando campo fator_correcao...');
    
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'produtos' 
        AND column_name = 'fator_correcao'
    `);

    if (checkColumn.rows.length === 0) {
      console.log('⚠️  Campo fator_correcao não existe. Adicionando...');
      
      await pool.query(`
        ALTER TABLE produtos 
        ADD COLUMN fator_correcao DECIMAL(10,2) DEFAULT 1.00
      `);
      
      console.log('✅ Campo fator_correcao adicionado!');
    } else {
      console.log('✅ Campo fator_correcao já existe');
    }

    // 2. Aplicar índices de performance
    console.log('\n📊 Aplicando índices de performance...');
    
    const sqlPath = path.join(__dirname, 'migrations/20260314_add_performance_indexes.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await pool.query(sql);
    console.log('✅ Índices aplicados!');

    // 3. Verificar índices criados
    const indexes = await pool.query(`
      SELECT 
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname
    `);

    console.log(`\n📈 Índices criados (${indexes.rows.length} total):`);
    
    const indexesByTable = {};
    indexes.rows.forEach(idx => {
      if (!indexesByTable[idx.tablename]) {
        indexesByTable[idx.tablename] = [];
      }
      indexesByTable[idx.tablename].push(idx.indexname);
    });

    Object.keys(indexesByTable).sort().forEach(table => {
      console.log(`\n  ${table}:`);
      indexesByTable[table].forEach(idx => {
        console.log(`    ✓ ${idx}`);
      });
    });

    // 4. Verificar estrutura da tabela produtos
    console.log('\n🔍 Estrutura da tabela produtos:');
    const produtosColumns = await pool.query(`
      SELECT 
        column_name, 
        data_type,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'produtos'
      ORDER BY ordinal_position
    `);

    produtosColumns.rows.forEach(col => {
      const defaultVal = col.column_default ? ` (default: ${col.column_default})` : '';
      console.log(`  • ${col.column_name}: ${col.data_type}${defaultVal}`);
    });

    console.log(`\n✅ ${dbName} sincronizado com sucesso!`);

  } catch (error) {
    console.error(`\n❌ Erro em ${dbName}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Iniciando sincronização completa dos bancos de dados...\n');

  try {
    // Sincronizar banco local
    await syncDatabase(localPool, 'LOCAL');

    // Sincronizar banco Neon
    await syncDatabase(neonPool, 'NEON (Produção)');

    console.log('\n' + '='.repeat(60));
    console.log('🎉 SINCRONIZAÇÃO COMPLETA!');
    console.log('='.repeat(60));
    console.log('\n✅ Ambos os bancos estão sincronizados');
    console.log('✅ Campo fator_correcao verificado/adicionado');
    console.log('✅ Índices de performance aplicados\n');

  } catch (error) {
    console.error('\n❌ Erro na sincronização:', error.message);
    process.exit(1);
  } finally {
    await localPool.end();
    await neonPool.end();
  }
}

main();
