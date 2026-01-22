const { Pool } = require('pg');
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

async function executarMigracaoUnidade() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando migração: Adicionar unidade à tabela contrato_produtos...');
    
    // Verificar se a coluna já existe
    console.log('📋 Verificando se a coluna unidade já existe...');
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contrato_produtos' AND column_name = 'unidade'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ Coluna unidade já existe! Migração não necessária.');
      return;
    }
    
    // Passo 1: Adicionar coluna unidade
    console.log('📝 Passo 1: Adicionando coluna unidade...');
    await client.query('ALTER TABLE contrato_produtos ADD COLUMN unidade VARCHAR(50)');
    console.log('✅ Coluna unidade adicionada com sucesso');
    
    // Passo 2: Atualizar registros existentes com unidades dos produtos
    console.log('📝 Passo 2: Copiando unidades dos produtos para contratos...');
    const updateResult = await client.query(`
      UPDATE contrato_produtos 
      SET unidade = p.unidade 
      FROM produtos p 
      WHERE contrato_produtos.produto_id = p.id AND contrato_produtos.unidade IS NULL
    `);
    console.log(`✅ ${updateResult.rowCount} registros atualizados com unidades dos produtos`);
    
    // Passo 3: Definir unidade padrão para registros sem unidade
    console.log('📝 Passo 3: Definindo unidade padrão para registros restantes...');
    const defaultResult = await client.query(`
      UPDATE contrato_produtos 
      SET unidade = 'Kg' 
      WHERE unidade IS NULL
    `);
    console.log(`✅ ${defaultResult.rowCount} registros receberam unidade padrão 'Kg'`);
    
    // Passo 4: Tornar coluna NOT NULL
    console.log('📝 Passo 4: Tornando coluna unidade obrigatória...');
    await client.query('ALTER TABLE contrato_produtos ALTER COLUMN unidade SET NOT NULL');
    console.log('✅ Coluna unidade agora é obrigatória');
    
    // Passo 5: Adicionar comentário
    console.log('📝 Passo 5: Adicionando documentação...');
    await client.query(`
      COMMENT ON COLUMN contrato_produtos.unidade IS 'Unidade de medida específica para este produto neste contrato'
    `);
    console.log('✅ Documentação adicionada');
    
    // Verificação final
    console.log('📋 Verificação final...');
    const finalCheck = await client.query(`
      SELECT COUNT(*) as total 
      FROM contrato_produtos 
      WHERE unidade IS NOT NULL
    `);
    console.log(`✅ Verificação final: ${finalCheck.rows[0].total} registros com unidade definida`);
    
    console.log('🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('');
    console.log('📋 Resumo da migração:');
    console.log('✅ Coluna unidade adicionada à tabela contrato_produtos');
    console.log('✅ Dados existentes migrados dos produtos');
    console.log('✅ Unidades padrão definidas onde necessário');
    console.log('✅ Coluna configurada como obrigatória');
    console.log('✅ Sistema agora suporta unidades específicas por contrato');
    console.log('');
    console.log('🚀 Agora você pode:');
    console.log('   • Editar unidades de produtos nos contratos');
    console.log('   • Ter o mesmo produto com unidades diferentes em contratos diferentes');
    console.log('   • Ver unidades específicas do contrato nos pedidos');
    
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
executarMigracaoUnidade()
  .then(() => {
    console.log('🎉 Processo de migração finalizado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Falha na migração:', error);
    process.exit(1);
  });