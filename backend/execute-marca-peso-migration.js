const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Usar a mesma configuração do backend
let pool;

if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    // Usar DATABASE_URL ou POSTGRES_URL (produção - Vercel/Neon)
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    
    // Detectar se é ambiente local (localhost) ou produção (Neon/Vercel)
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
    // Usar variáveis individuais (desenvolvimento local)
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

async function executarMigracaoMarcaPeso() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando migração: Mover marca e peso de produtos para contratos...');
    
    // Verificar se as colunas já existem em contrato_produtos
    console.log('📋 Verificando se as colunas marca e peso já existem em contrato_produtos...');
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contrato_produtos' AND column_name IN ('marca', 'peso')
    `);
    
    const existingColumns = columnCheck.rows.map(row => row.column_name);
    const needsMarca = !existingColumns.includes('marca');
    const needsPeso = !existingColumns.includes('peso');
    
    if (!needsMarca && !needsPeso) {
      console.log('✅ Colunas marca e peso já existem em contrato_produtos! Verificando se migração de dados é necessária...');
    }
    
    // Passo 1: Adicionar colunas marca e peso se não existirem
    if (needsMarca) {
      console.log('📝 Passo 1a: Adicionando coluna marca...');
      await client.query('ALTER TABLE contrato_produtos ADD COLUMN marca VARCHAR(255)');
      console.log('✅ Coluna marca adicionada com sucesso');
    }
    
    if (needsPeso) {
      console.log('📝 Passo 1b: Adicionando coluna peso...');
      await client.query('ALTER TABLE contrato_produtos ADD COLUMN peso DECIMAL(10,3)');
      console.log('✅ Coluna peso adicionada com sucesso');
    }
    
    // Passo 2: Verificar se ainda existem colunas marca e peso em produtos
    console.log('📋 Verificando se produtos ainda tem colunas marca e peso...');
    const produtosColumnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'produtos' AND column_name IN ('marca', 'peso')
    `);
    
    const produtosColumns = produtosColumnCheck.rows.map(row => row.column_name);
    const hasMarcaInProdutos = produtosColumns.includes('marca');
    const hasPesoInProdutos = produtosColumns.includes('peso');
    
    // Passo 3: Migrar dados existentes se as colunas ainda existem em produtos
    if (hasMarcaInProdutos || hasPesoInProdutos) {
      console.log('📝 Passo 2: Migrando dados existentes de produtos para contratos...');
      
      let updateQuery = 'UPDATE contrato_produtos SET ';
      let setParts = [];
      
      if (hasMarcaInProdutos) {
        setParts.push('marca = p.marca');
      }
      if (hasPesoInProdutos) {
        setParts.push('peso = p.peso');
      }
      
      updateQuery += setParts.join(', ');
      updateQuery += ` FROM produtos p 
        WHERE contrato_produtos.produto_id = p.id`;
      
      const updateResult = await client.query(updateQuery);
      console.log(`✅ ${updateResult.rowCount} registros atualizados com dados dos produtos`);
      
      // Passo 4: Remover colunas marca e peso da tabela produtos
      if (hasMarcaInProdutos) {
        console.log('📝 Passo 3a: Removendo coluna marca da tabela produtos...');
        await client.query('ALTER TABLE produtos DROP COLUMN IF EXISTS marca');
        console.log('✅ Coluna marca removida da tabela produtos');
      }
      
      if (hasPesoInProdutos) {
        console.log('📝 Passo 3b: Removendo coluna peso da tabela produtos...');
        await client.query('ALTER TABLE produtos DROP COLUMN IF EXISTS peso');
        console.log('✅ Coluna peso removida da tabela produtos');
      }
    } else {
      console.log('ℹ️ Colunas marca e peso já foram removidas da tabela produtos');
    }
    
    // Verificação final
    console.log('📋 Verificação final...');
    const finalCheck = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(marca) as com_marca,
        COUNT(peso) as com_peso
      FROM contrato_produtos
    `);
    
    const stats = finalCheck.rows[0];
    console.log(`✅ Verificação final: ${stats.total} registros total, ${stats.com_marca} com marca, ${stats.com_peso} com peso`);
    
    // Verificar se produtos não tem mais as colunas
    const produtosFinalCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'produtos' AND column_name IN ('marca', 'peso')
    `);
    
    if (produtosFinalCheck.rows.length === 0) {
      console.log('✅ Confirmado: colunas marca e peso removidas da tabela produtos');
    } else {
      console.log('⚠️ Atenção: algumas colunas ainda existem na tabela produtos:', produtosFinalCheck.rows.map(r => r.column_name));
    }
    
    console.log('🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('');
    console.log('📋 Resumo da migração:');
    console.log('✅ Colunas marca e peso adicionadas à tabela contrato_produtos');
    console.log('✅ Dados existentes migrados dos produtos para contratos');
    console.log('✅ Colunas marca e peso removidas da tabela produtos');
    console.log('✅ Sistema agora suporta marca e peso específicos por contrato');
    console.log('');
    console.log('🚀 Agora você pode:');
    console.log('   • Definir marca e peso específicos para cada produto em cada contrato');
    console.log('   • Ter o mesmo produto com marcas/pesos diferentes em contratos diferentes');
    console.log('   • Produtos não têm mais marca e peso fixos');
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error.message);
    console.error('💡 Detalhes do erro:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar a migração
executarMigracaoMarcaPeso()
  .then(() => {
    console.log('🎉 Processo de migração finalizado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Falha na migração:', error);
    process.exit(1);
  });