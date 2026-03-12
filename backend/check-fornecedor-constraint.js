require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false
});

async function checkConstraint() {
  try {
    const result = await pool.query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint
      WHERE conrelid = 'fornecedores'::regclass
      AND contype = 'c'
    `);
    
    console.log('📋 Constraints CHECK na tabela fornecedores:\n');
    result.rows.forEach(row => {
      console.log(`Constraint: ${row.constraint_name}`);
      console.log(`Definition: ${row.constraint_definition}\n`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkConstraint();
