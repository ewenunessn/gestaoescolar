const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
});

async function verificarEstruturaGuias() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando estrutura das tabelas de guias...\n');

    // Listar todas as tabelas relacionadas a guias
    const tabelasResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%guia%'
      ORDER BY table_name
    `);

    console.log('📋 Tabelas relacionadas a guias:');
    tabelasResult.rows.forEach(row => console.log('  -', row.table_name));

    // Para cada tabela, mostrar estrutura
    for (const row of tabelasResult.rows) {
      const tableName = row.table_name;
      console.log(`\n📊 Estrutura da tabela ${tableName}:`);
      
      const colunasResult = await client.query(`
        SELECT 
          column_name, 
          data_type, 
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      colunasResult.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      });
    }

    // Verificar se há dados de exemplo
    console.log('\n📦 Exemplo de dados em guias_demanda_itens:');
    const exemploResult = await client.query(`
      SELECT * FROM guias_demanda_itens LIMIT 1
    `);
    if (exemploResult.rows.length > 0) {
      console.log(JSON.stringify(exemploResult.rows[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

verificarEstruturaGuias();
