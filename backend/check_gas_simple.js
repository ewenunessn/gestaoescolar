const { Client } = require('pg');

console.log('🔧 Script para verificar tabelas de gás no Neon Database');
console.log('\n📋 INSTRUÇÕES:');
console.log('1. Acesse o painel do Neon (https://console.neon.tech)');
console.log('2. Vá para seu projeto e copie a Connection String');
console.log('3. Execute este script com a URL: node check_gas_simple.js "sua_connection_string"');
console.log('\nOu defina a variável de ambiente:');
console.log('set DATABASE_URL=sua_connection_string && node check_gas_simple.js');

// Obter URL de conexão dos argumentos ou variável de ambiente
const connectionString = process.argv[2] || process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.log('\n❌ URL de conexão não fornecida!');
  console.log('\n💡 Exemplo de uso:');
  console.log('node check_gas_simple.js "postgresql://user:password@host/database"');
  process.exit(1);
}

console.log('\n🔗 Conectando ao Neon Database...');

// String de conexão do Neon

(async () => {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('🔍 Verificando tabelas de gás...');
    
    // Listar tabelas com 'gas' no nome
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%gas%' 
      ORDER BY table_name
    `);
    
    console.log('📊 Tabelas de gás encontradas:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Verificar estrutura da tabela gas_estoque
    console.log('\n🔍 Estrutura da tabela gas_estoque:');
    const estrutura = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'gas_estoque' 
      ORDER BY ordinal_position
    `);
    
    estrutura.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // Verificar se existe tabela gas_movimentacoes_estoque
    console.log('\n🔍 Verificando tabela gas_movimentacoes_estoque:');
    const movimentacoes = await client.query(`
      SELECT COUNT(*) as exists 
      FROM information_schema.tables 
      WHERE table_name = 'gas_movimentacoes_estoque'
    `);
    
    if (parseInt(movimentacoes.rows[0].exists) > 0) {
      console.log('✅ Tabela gas_movimentacoes_estoque existe');
      
      const estruturaMovimentacoes = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'gas_movimentacoes_estoque' 
        ORDER BY ordinal_position
      `);
      
      console.log('📊 Estrutura da tabela gas_movimentacoes_estoque:');
      estruturaMovimentacoes.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });
    } else {
      console.log('❌ Tabela gas_movimentacoes_estoque NÃO existe');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
    process.exit(0);
  }
})();