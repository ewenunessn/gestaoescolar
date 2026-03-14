const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkRelacionamento() {
  try {
    console.log('🔍 Buscando tabelas relacionadas...\n');
    
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND (table_name LIKE '%escola%' OR table_name LIKE '%modalidade%')
      ORDER BY table_name
    `);
    
    console.log('📋 Tabelas encontradas:');
    tables.rows.forEach(t => console.log(`  - ${t.table_name}`));
    console.log('\n');
    
    // Verificar escola_modalidades (plural)
    const escolaModalidades = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'escola_modalidades' 
      ORDER BY ordinal_position
    `);
    
    if (escolaModalidades.rows.length > 0) {
      console.log('📊 Tabela escola_modalidades:');
      escolaModalidades.rows.forEach(r => {
        console.log(`  - ${r.column_name}: ${r.data_type}`);
      });
      
      const dados = await pool.query('SELECT * FROM escola_modalidades LIMIT 5');
      console.log('\n📝 Exemplos:');
      console.log(JSON.stringify(dados.rows, null, 2));
    } else {
      console.log('❌ Tabela escola_modalidades não existe');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkRelacionamento();
