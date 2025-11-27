const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function checkStructure() {
  try {
    await client.connect();
    console.log('✅ Conectado ao Neon\n');
    
    // Verificar se a tabela existe
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'demandas'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ Tabela demandas não existe no Neon!');
      console.log('\nA tabela precisa ser criada. Opções:');
      console.log('1. Executar migration 017_add_tenant_to_demandas.sql');
      console.log('2. Criar a tabela manualmente');
      return;
    }
    
    console.log('✅ Tabela demandas existe\n');
    
    // Verificar estrutura
    const columns = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'demandas'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Estrutura da tabela demandas:\n');
    console.log('Colunas:');
    columns.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const def = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`  ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${nullable}${def}`);
    });
    
    // Contar registros
    const count = await client.query('SELECT COUNT(*) FROM demandas');
    console.log(`\n📊 Total de registros: ${count.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

checkStructure();
