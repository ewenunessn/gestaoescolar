const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function fixViews() {
  console.log('\n🔧 Corrigindo views do estoque central...\n');

  try {
    const sql = fs.readFileSync('./fix-view-estoque.sql', 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Views corrigidas com sucesso!\n');
    
    // Testar a view
    console.log('🔍 Testando view vw_estoque_central_completo...\n');
    const result = await pool.query(`
      SELECT id, produto_nome, unidade, quantidade_disponivel
      FROM vw_estoque_central_completo
      WHERE LOWER(produto_nome) LIKE '%leite%'
      ORDER BY produto_nome
    `);
    
    if (result.rows.length > 0) {
      console.log('📦 Produtos com leite no estoque:\n');
      result.rows.forEach(item => {
        console.log(`- ${item.produto_nome}: ${item.quantidade_disponivel} ${item.unidade}`);
      });
    } else {
      console.log('❌ Nenhum produto com leite no estoque');
    }
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

fixViews();
