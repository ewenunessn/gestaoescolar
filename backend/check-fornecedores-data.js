require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false
});

async function checkData() {
  try {
    const result = await pool.query(`
      SELECT id, nome, tipo_fornecedor, dap_caf, data_validade_dap
      FROM fornecedores
      ORDER BY id
      LIMIT 10
    `);
    
    console.log('📋 Fornecedores no banco:\n');
    result.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`Nome: ${row.nome}`);
      console.log(`Tipo: ${row.tipo_fornecedor}`);
      console.log(`DAP/CAF: ${row.dap_caf || 'N/A'}`);
      console.log(`Validade: ${row.data_validade_dap || 'N/A'}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkData();
