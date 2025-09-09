const { Pool } = require('pg');

// Configuração do banco de produção
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    console.log('Verificando estrutura da tabela estoque_lotes...');
    
    // Verificar colunas da tabela estoque_lotes
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'estoque_lotes'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('\nColunas da tabela estoque_lotes:');
    if (columns.rows.length === 0) {
      console.log('Tabela não encontrada ou sem colunas.');
    } else {
      columns.rows.forEach(row => {
        console.log(`- ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    }
    
    // Verificar algumas linhas de exemplo
    console.log('\nExemplo de dados (primeiras 3 linhas):');
    try {
      const sample = await pool.query('SELECT * FROM estoque_lotes LIMIT 3');
      console.log(sample.rows);
    } catch (error) {
      console.log('Erro ao buscar dados:', error.message);
    }
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
})();