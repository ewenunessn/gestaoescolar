const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function listarProdutos() {
  console.log('\n📦 Listando produtos do banco...\n');

  try {
    const result = await pool.query(`
      SELECT p.id, p.nome, COALESCE(um.codigo, p.unidade_distribuicao, 'UN') as unidade
      FROM produtos p
      LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
      WHERE p.ativo = true
      ORDER BY p.nome
    `);

    console.log(`Total de produtos: ${result.rows.length}\n`);
    
    result.rows.forEach(produto => {
      console.log(`${produto.id.toString().padStart(4)} - ${produto.nome.padEnd(50)} (${produto.unidade})`);
    });

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

listarProdutos();
