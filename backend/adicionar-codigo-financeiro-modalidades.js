// Usar a configuração de banco existente do projeto
const db = require('./dist/database.js');

async function adicionarCodigoFinanceiroModalidades() {
  const client = await db.pool.connect();
  
  try {
    console.log('🔍 Verificando estrutura atual da tabela modalidades...');
    
    // Verificar se a tabela modalidades existe
    const tabelaExiste = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'modalidades'
      );
    `);
    
    if (!tabelaExiste.rows[0].exists) {
      console.log('❌ Tabela modalidades não encontrada!');
      return;
    }
    
    console.log('✅ Tabela modalidades encontrada');
    
    // Verificar estrutura atual
    const estruturaAtual = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'modalidades' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Estrutura atual da tabela modalidades:');
    estruturaAtual.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });
    
    // Verificar se o campo codigo_financeiro já existe
    const campoExiste = estruturaAtual.rows.some(col => col.column_name === 'codigo_financeiro');
    
    if (campoExiste) {
      console.log('\n⚠️  Campo codigo_financeiro já existe na tabela modalidades');
      return;
    }
    
    console.log('\n🔧 Adicionando campo codigo_financeiro...');
    
    // Adicionar o campo codigo_financeiro
    await client.query(`
      ALTER TABLE modalidades 
      ADD COLUMN codigo_financeiro VARCHAR(50);
    `);
    
    console.log('✅ Campo codigo_financeiro adicionado com sucesso!');
    
    // Adicionar comentário
    await client.query(`
      COMMENT ON COLUMN modalidades.codigo_financeiro IS 'Código usado no sistema financeiro (ex: 2.036, 1.025, etc.)';
    `);
    
    console.log('✅ Comentário adicionado ao campo');
    
    // Criar índice para busca rápida
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_modalidades_codigo_financeiro 
      ON modalidades(codigo_financeiro);
    `);
    
    console.log('✅ Índice criado para o campo codigo_financeiro');
    
    // Verificar estrutura final
    const estruturaFinal = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'modalidades' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Estrutura final da tabela modalidades:');
    estruturaFinal.rows.forEach(col => {
      const isNew = col.column_name === 'codigo_financeiro';
      const marker = isNew ? '🆕' : '  ';
      console.log(`${marker} ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });
    
    console.log('\n🎉 Campo codigo_financeiro adicionado com sucesso à tabela modalidades!');
    
  } catch (error) {
    console.error('❌ Erro ao adicionar campo codigo_financeiro:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Executar o script
if (require.main === module) {
  adicionarCodigoFinanceiroModalidades()
    .then(() => {
      console.log('\n✅ Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro na execução do script:', error);
      process.exit(1);
    });
}

module.exports = { adicionarCodigoFinanceiroModalidades };