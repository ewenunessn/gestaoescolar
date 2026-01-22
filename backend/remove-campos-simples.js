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

async function removerCamposSimples() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando remoção de campos da tabela produtos...');
    
    // Passo 1: Remover views e materialized views que dependem da coluna unidade
    console.log('🗑️ Removendo views dependentes...');
    
    const viewsToRemove = [
      'mv_estoque_resumo_performance',
      'view_saldo_contratos_itens', 
      'view_saldo_contratos_modalidades'
    ];
    
    for (const viewName of viewsToRemove) {
      try {
        // Tentar como materialized view primeiro
        await client.query(`DROP MATERIALIZED VIEW IF EXISTS ${viewName} CASCADE`);
        console.log(`✅ Materialized view ${viewName} removida`);
      } catch (error) {
        try {
          // Se não for materialized view, tentar como view normal
          await client.query(`DROP VIEW IF EXISTS ${viewName} CASCADE`);
          console.log(`✅ View ${viewName} removida`);
        } catch (error2) {
          console.log(`⚠️ ${viewName} não encontrada ou já removida`);
        }
      }
    }
    
    // Passo 2: Verificar quais colunas existem
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
    
    if (existingColumns.length === 0) {
      console.log('✅ Nenhuma coluna para remover. Migração já foi executada.');
      return;
    }
    
    // Passo 3: Remover as colunas uma por uma
    for (const column of existingColumns) {
      console.log(`🗑️ Removendo coluna '${column}' da tabela produtos...`);
      try {
        await client.query(`ALTER TABLE produtos DROP COLUMN ${column} CASCADE`);
        console.log(`✅ Coluna '${column}' removida com sucesso`);
      } catch (error) {
        console.log(`⚠️ Erro ao remover coluna '${column}':`, error.message);
        // Continuar com as outras colunas mesmo se uma falhar
      }
    }
    
    // Passo 4: Verificação final
    console.log('📋 Verificação final...');
    const finalCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'produtos' 
      AND column_name IN ('unidade', 'peso', 'fator_divisao')
    `);
    
    const remainingColumns = finalCheck.rows.map(row => row.column_name);
    
    if (remainingColumns.length === 0) {
      console.log('✅ Verificação final: Todas as colunas foram removidas com sucesso');
    } else {
      console.log('⚠️ Algumas colunas ainda existem:', remainingColumns);
    }
    
    // Passo 5: Mostrar estrutura atual da tabela produtos
    console.log('📋 Estrutura atual da tabela produtos:');
    const currentStructure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'produtos'
      ORDER BY ordinal_position
    `);
    
    console.table(currentStructure.rows);
    
    console.log('🎉 REMOÇÃO DE CAMPOS CONCLUÍDA!');
    console.log('');
    console.log('📋 Resumo da operação:');
    console.log(`✅ Colunas processadas: ${existingColumns.join(', ')}`);
    console.log(`✅ Colunas removidas: ${existingColumns.filter(col => !remainingColumns.includes(col)).join(', ')}`);
    if (remainingColumns.length > 0) {
      console.log(`⚠️ Colunas que permaneceram: ${remainingColumns.join(', ')}`);
    }
    console.log('✅ Views dependentes removidas');
    console.log('✅ Tabela produtos simplificada');
    console.log('');
    console.log('🚀 Benefícios:');
    console.log('   • Estrutura mais limpa e focada');
    console.log('   • Unidades gerenciadas apenas nos contratos');
    console.log('   • Menos campos desnecessários no cadastro');
    
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
removerCamposSimples()
  .then(() => {
    console.log('🎉 Processo de remoção finalizado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Falha na remoção:', error);
    process.exit(1);
  });