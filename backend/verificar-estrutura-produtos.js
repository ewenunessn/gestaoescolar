const db = require('./dist/database.js');

async function verificarEstruturaProdutos() {
  try {
    console.log('🔍 Verificando estrutura da tabela produtos...\n');
    
    const result = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'produtos' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Colunas da tabela produtos:');
    result.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Verificar se existe unidade_medida
    const temUnidadeMedida = result.rows.some(col => col.column_name === 'unidade_medida');
    
    if (temUnidadeMedida) {
      console.log('\n✅ Coluna unidade_medida encontrada');
    } else {
      console.log('\n❌ Coluna unidade_medida NÃO encontrada');
      
      // Verificar se existe uma coluna similar
      const colunasSimilares = result.rows.filter(col => 
        col.column_name.includes('unidade') || 
        col.column_name.includes('medida') ||
        col.column_name.includes('unit')
      );
      
      if (colunasSimilares.length > 0) {
        console.log('🔍 Colunas similares encontradas:');
        colunasSimilares.forEach(col => {
          console.log(`  - ${col.column_name}: ${col.data_type}`);
        });
      }
    }
    
    // Verificar algumas linhas de exemplo
    console.log('\n📊 Exemplo de dados da tabela produtos:');
    const exemplos = await db.query('SELECT * FROM produtos LIMIT 3');
    
    if (exemplos.rows.length > 0) {
      console.log('Colunas disponíveis:', Object.keys(exemplos.rows[0]).join(', '));
      exemplos.rows.forEach((produto, index) => {
        console.log(`\nProduto ${index + 1}:`);
        Object.keys(produto).forEach(key => {
          console.log(`  ${key}: ${produto[key]}`);
        });
      });
    } else {
      console.log('Nenhum produto encontrado na tabela');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error.message);
  }
}

verificarEstruturaProdutos()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Erro:', err);
    process.exit(1);
  });