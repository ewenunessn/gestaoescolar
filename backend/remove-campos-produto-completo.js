const { Pool } = require('pg');
require('dotenv').config();

// Usar a mesma configuração do backend
let pool;

if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    const isLocalDatabase = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    
    if (isLocalDatabase) {
        console.log('✅ Usando connection string LOCAL (sem SSL)');
        pool = new Pool({
            connectionString,
            ssl: false
        });
    } else {
        console.log('✅ Usando connection string para Neon/Vercel (com SSL)');
        pool = new Pool({
            connectionString,
            ssl: {
                rejectUnauthorized: false
            }
        });
    }
} else {
    const dbConfig = {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'alimentacao_escolar',
        password: process.env.DB_PASSWORD || 'admin123',
        port: parseInt(process.env.DB_PORT || '5432'),
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    };

    console.log('🔧 Usando configuração local:', {
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.user
    });

    pool = new Pool(dbConfig);
}

async function removerCamposProdutoCompleto() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando remoção completa de campos da tabela produtos...');
    
    // Passo 1: Verificar dependências
    console.log('📋 Verificando dependências da coluna unidade...');
    const dependencies = await client.query(`
      SELECT DISTINCT 
        dependent_ns.nspname as dependent_schema,
        dependent_view.relname as dependent_view,
        class.relkind
      FROM pg_depend 
      JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid 
      JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid 
      JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid 
      JOIN pg_attribute ON pg_depend.refobjid = pg_attribute.attrelid 
        AND pg_depend.refobjsubid = pg_attribute.attnum 
      JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_view.relnamespace
      WHERE source_table.relname = 'produtos' 
        AND pg_attribute.attname = 'unidade'
        AND dependent_view.relname != 'produtos'
    `);
    
    console.log('📋 Dependências encontradas:');
    dependencies.rows.forEach(dep => {
      const type = dep.relkind === 'v' ? 'VIEW' : dep.relkind === 'm' ? 'MATERIALIZED VIEW' : 'OTHER';
      console.log(`   • ${dep.dependent_view} (${type})`);
    });
    
    // Passo 2: Remover/Recriar views dependentes
    console.log('🗑️ Removendo views dependentes...');
    
    // Remover materialized view primeiro
    try {
      await client.query('DROP MATERIALIZED VIEW IF EXISTS mv_estoque_resumo_performance CASCADE');
      console.log('✅ Materialized view mv_estoque_resumo_performance removida');
    } catch (error) {
      console.log('⚠️ mv_estoque_resumo_performance não encontrada ou já removida');
    }
    
    // Remover views
    const viewsToRemove = [
      'view_saldo_contratos_itens',
      'view_saldo_contratos_modalidades'
    ];
    
    for (const viewName of viewsToRemove) {
      try {
        await client.query(`DROP VIEW IF EXISTS ${viewName} CASCADE`);
        console.log(`✅ View ${viewName} removida`);
      } catch (error) {
        console.log(`⚠️ View ${viewName} não encontrada ou já removida`);
      }
    }
    
    // Passo 3: Verificar quais colunas ainda existem
    console.log('📋 Verificando colunas existentes na tabela produtos...');
    const columnsCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'produtos' 
      AND column_name IN ('unidade', 'peso', 'fator_divisao')
      ORDER BY column_name
    `);
    
    const existingColumns = columnsCheck.rows.map(row => row.column_name);
    console.log('📋 Colunas encontradas para remoção:', existingColumns);
    
    // Passo 4: Remover as colunas
    for (const column of existingColumns) {
      console.log(`🗑️ Removendo coluna '${column}' da tabela produtos...`);
      try {
        await client.query(`ALTER TABLE produtos DROP COLUMN IF EXISTS ${column} CASCADE`);
        console.log(`✅ Coluna '${column}' removida com sucesso`);
      } catch (error) {
        console.log(`⚠️ Erro ao remover coluna '${column}':`, error.message);
      }
    }
    
    // Passo 5: Verificação final
    console.log('📋 Verificação final...');
    const finalCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'produtos' 
      AND column_name IN ('unidade', 'peso', 'fator_divisao')
    `);
    
    if (finalCheck.rows.length === 0) {
      console.log('✅ Verificação final: Todas as colunas foram removidas com sucesso');
    } else {
      console.log('⚠️ Algumas colunas ainda existem:', finalCheck.rows.map(r => r.column_name));
    }
    
    // Passo 6: Mostrar estrutura atual da tabela produtos
    console.log('📋 Estrutura atual da tabela produtos:');
    const currentStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'produtos'
      ORDER BY ordinal_position
    `);
    
    console.table(currentStructure.rows);
    
    console.log('🎉 REMOÇÃO DE CAMPOS CONCLUÍDA COM SUCESSO!');
    console.log('');
    console.log('📋 Resumo da operação:');
    console.log(`✅ ${existingColumns.length} colunas removidas: ${existingColumns.join(', ')}`);
    console.log('✅ Views dependentes removidas');
    console.log('✅ Tabela produtos simplificada');
    console.log('✅ Unidades agora são gerenciadas apenas nos contratos');
    console.log('');
    console.log('🚀 Benefícios:');
    console.log('   • Estrutura mais limpa e focada');
    console.log('   • Unidades flexíveis por contrato');
    console.log('   • Menos campos desnecessários no cadastro de produtos');
    console.log('   • Melhor organização dos dados');
    console.log('');
    console.log('⚠️ Nota: Algumas views foram removidas. Se necessário, elas podem ser recriadas');
    console.log('   usando as unidades dos contratos ao invés dos produtos.');
    
  } catch (error) {
    console.error('❌ Erro durante a remoção:', error.message);
    console.error('💡 Detalhes do erro:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar a remoção
removerCamposProdutoCompleto()
  .then(() => {
    console.log('🎉 Processo de remoção finalizado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Falha na remoção:', error);
    process.exit(1);
  });