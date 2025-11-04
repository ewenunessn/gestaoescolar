/**
 * Script para executar migração de adição de tenant_id às tabelas existentes
 * Execute com: node run-add-tenant-id-migration.js
 */

const fs = require('fs');
const path = require('path');

// Importar configuração do banco baseada no ambiente
const db = process.env.VERCEL === '1' ? require("./dist/database-vercel") : require("./dist/database");

async function runAddTenantIdMigration() {
  try {
    console.log('🚀 Iniciando migração de tenant_id...');
    
    // Testar conexão
    const connected = await db.testConnection();
    if (!connected) {
      throw new Error('Falha na conexão com o banco de dados');
    }
    
    // Ler arquivo de migração
    const migrationPath = path.join(__dirname, 'migrations', '002_add_tenant_id_simple.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Executando migração: 002_add_tenant_id_simple.sql');
    
    // Executar migração
    console.log('  Executando migração completa...');
    await db.query(migrationSQL);
    
    console.log('✅ Migração executada com sucesso!');
    
    // Verificar se as colunas foram adicionadas
    const columnsResult = await db.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE column_name = 'tenant_id' 
        AND table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📊 Colunas tenant_id adicionadas:');
    columnsResult.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}.tenant_id (${row.data_type}, nullable: ${row.is_nullable})`);
    });
    
    // Verificar dados migrados
    const dataCheckResult = await db.query(`
      SELECT 
        'escolas' as tabela,
        COUNT(*) as total_registros,
        COUNT(tenant_id) as registros_com_tenant_id
      FROM escolas
      UNION ALL
      SELECT 
        'produtos' as tabela,
        COUNT(*) as total_registros,
        COUNT(tenant_id) as registros_com_tenant_id
      FROM produtos
      UNION ALL
      SELECT 
        'usuarios' as tabela,
        COUNT(*) as total_registros,
        COUNT(tenant_id) as registros_com_tenant_id
      FROM usuarios
      ORDER BY tabela
    `);
    
    console.log('📈 Verificação de dados migrados:');
    dataCheckResult.rows.forEach(row => {
      console.log(`  ${row.tabela}: ${row.registros_com_tenant_id}/${row.total_registros} registros com tenant_id`);
    });
    
    // Verificar índices criados
    const indexesResult = await db.query(`
      SELECT 
        indexname,
        tablename
      FROM pg_indexes 
      WHERE indexname LIKE '%tenant%'
        AND schemaname = 'public'
      ORDER BY tablename, indexname
    `);
    
    console.log('🔍 Índices de tenant criados:');
    indexesResult.rows.forEach(row => {
      console.log(`  ✓ ${row.tablename}.${row.indexname}`);
    });
    
    console.log('\n🎉 Migração de tenant_id concluída com sucesso!');
    console.log('\nPróximos passos:');
    console.log('1. Implementar Row Level Security (RLS)');
    console.log('2. Atualizar controllers para usar tenant context');
    console.log('3. Testar isolamento de dados');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    console.error('\nDetalhes do erro:');
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Fechar conexão
    if (db.pool) {
      await db.pool.end();
    }
    process.exit(0);
  }
}

// Executar migração
runAddTenantIdMigration();