const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verify() {
  try {
    const result = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'pedido_itens' 
        AND column_name IN ('quantidade_kg', 'unidade', 'quantidade_distribuicao', 'unidade_distribuicao')
      ORDER BY column_name
    `);
    
    console.log('\n📋 Campos criados em pedido_itens:\n');
    result.rows.forEach(row => {
      const maxLen = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
      const nullable = row.is_nullable === 'YES' ? '✅ Nullable' : '❌ Not Null';
      console.log(`   ${row.column_name.padEnd(30)} | ${(row.data_type + maxLen).padEnd(25)} | ${nullable}`);
    });
    
    // Verificar se há pedidos existentes
    const countResult = await pool.query('SELECT COUNT(*) as total FROM pedido_itens');
    console.log(`\n📊 Total de itens em pedidos: ${countResult.rows[0].total}`);
    
    await pool.end();
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verify();
