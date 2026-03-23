const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function check() {
  try {
    const result = await pool.query(`
      SELECT 
        cp.id, 
        cp.produto_id, 
        cp.peso_embalagem, 
        cp.unidade_compra, 
        cp.fator_conversao, 
        c.numero, 
        c.status, 
        c.data_fim 
      FROM contrato_produtos cp 
      JOIN contratos c ON c.id = cp.contrato_id 
      WHERE cp.produto_id = 118 
        AND cp.ativo = true 
        AND c.status = 'ativo' 
        AND c.data_fim >= CURRENT_DATE
    `);
    
    console.log('\n📦 Contratos para Chicória (ID 118):\n');
    if (result.rows.length === 0) {
      console.log('❌ Nenhum contrato ativo encontrado');
    } else {
      result.rows.forEach(row => console.log(JSON.stringify(row, null, 2)));
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await pool.end();
    process.exit(1);
  }
}

check();
