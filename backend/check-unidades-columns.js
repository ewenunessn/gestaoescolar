require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function checkColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'unidades_medida' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Colunas da tabela unidades_medida:\n');
    result.rows.forEach(c => {
      console.log(`  - ${c.column_name} (${c.data_type})`);
    });
    console.log('');
    
    // Mostrar alguns registros
    const data = await pool.query('SELECT * FROM unidades_medida LIMIT 5');
    console.log('📦 Exemplos de registros:\n');
    data.rows.forEach(r => {
      console.log(`  ID: ${r.id}, Nome: ${r.nome}, Símbolo: ${r.simbolo || r.sigla || 'N/A'}`);
    });
    console.log('');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkColumns();
