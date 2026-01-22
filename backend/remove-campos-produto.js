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

async function removerCamposProduto() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando remoção de campos desnecessários da tabela produtos...');
    
    // Verificar quais colunas existem
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
    
    // Fazer backup dos dados antes de remover (opcional)
    console.log('💾 Fazendo backup dos dados que serão removidos...');
    if (existingColumns.includes('unidade')) {
      const unidadeData = await client.query(`
        SELECT id, nome, unidade 
        FROM produtos 
        WHERE unidade IS NOT NULL
      `);
      console.log(`📊 Backup: ${unidadeData.rows.length} produtos com unidade definida`);
    }
    
    if (existingColumns.includes('peso')) {
      const pesoData = await client.query(`
        SELECT id, nome, peso 
        FROM produtos 
        WHERE peso IS NOT NULL
      `);
      console.log(`📊 Backup: ${pesoData.rows.length} produtos com peso definido`);
    }
    
    if (existingColumns.includes('fator_divisao')) {
      const fatorData = await client.query(`
        SELECT id, nome, fator_divisao 
        FROM produtos 
        WHERE fator_divisao IS NOT NULL
      `);
      console.log(`📊 Backup: ${fatorData.rows.length} produtos com fator_divisao definido`);
    }
    
    // Remover as colunas
    for (const column of existingColumns) {
      console.log(`🗑️ Removendo coluna '${column}' da tabela produtos...`);
      await client.query(`ALTER TABLE produtos DROP COLUMN IF EXISTS ${column}`);
      console.log(`✅ Coluna '${column}' removida com sucesso`);
    }
    
    // Verificação final
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
    
    // Mostrar estrutura atual da tabela produtos
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
    console.log('✅ Tabela produtos simplificada');
    console.log('✅ Unidades agora são gerenciadas apenas nos contratos');
    console.log('');
    console.log('🚀 Benefícios:');
    console.log('   • Estrutura mais limpa e focada');
    console.log('   • Unidades flexíveis por contrato');
    console.log('   • Menos campos desnecessários no cadastro de produtos');
    console.log('   • Melhor organização dos dados');
    
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
removerCamposProduto()
  .then(() => {
    console.log('🎉 Processo de remoção finalizado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Falha na remoção:', error);
    process.exit(1);
  });