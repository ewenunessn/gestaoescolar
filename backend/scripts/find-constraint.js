const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar'
});

async function findConstraint() {
  try {
    const result = await pool.query(`
      SELECT 
        tc.table_name, 
        tc.constraint_name, 
        tc.constraint_type
      FROM information_schema.table_constraints tc
      WHERE tc.constraint_name LIKE '%refeicao_produto%'
        OR tc.constraint_name LIKE '%cardapio%'
      ORDER BY tc.table_name, tc.constraint_name
    `);
    
    console.log(`Constraints encontradas: ${result.rows.length}\n`);
    result.rows.forEach(row => {
      console.log(`${row.table_name}.${row.constraint_name} (${row.constraint_type})`);
    });
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
}

findConstraint();
