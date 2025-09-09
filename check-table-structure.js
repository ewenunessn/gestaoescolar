const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function checkTableStructure() {
  try {
    console.log('Verificando estrutura da tabela gas_controle...');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'gas_controle' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nColunas da tabela gas_controle:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    if (result.rows.length === 0) {
      console.log('\nTabela gas_controle não encontrada!');
    }
    
  } catch (error) {
    console.error('Erro ao verificar estrutura:', error.message);
  } finally {
    await pool.end();
  }
}

checkTableStructure();