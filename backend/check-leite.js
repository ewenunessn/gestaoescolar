const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function verificarLeite() {
  console.log('\n🔍 Verificando produto Leite...\n');

  try {
    // Buscar Leite
    const result = await pool.query(`
      SELECT 
        p.id,
        p.nome,
        p.unidade_medida_id,
        p.unidade_distribuicao,
        um.id as um_id,
        um.codigo as um_codigo,
        um.nome as um_nome,
        COALESCE(um.codigo, p.unidade_distribuicao, 'UN') as unidade_final
      FROM produtos p
      LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
      WHERE LOWER(p.nome) LIKE '%leite%'
      ORDER BY p.nome
    `);

    if (result.rows.length === 0) {
      console.log('❌ Nenhum produto com "leite" encontrado');
      return;
    }

    console.log('📦 Produtos encontrados:\n');
    result.rows.forEach(produto => {
      console.log(`ID: ${produto.id}`);
      console.log(`Nome: ${produto.nome}`);
      console.log(`unidade_medida_id: ${produto.unidade_medida_id}`);
      console.log(`unidade_distribuicao: ${produto.unidade_distribuicao}`);
      console.log(`UM ID: ${produto.um_id}`);
      console.log(`UM Código: ${produto.um_codigo}`);
      console.log(`UM Nome: ${produto.um_nome}`);
      console.log(`Unidade Final: ${produto.unidade_final}`);
      console.log('---');
    });

    // Verificar estoque central
    console.log('\n🔍 Verificando estoque central do leite...\n');
    
    const estoqueResult = await pool.query(`
      SELECT 
        ec.id as estoque_id,
        p.id as produto_id,
        p.nome as produto_nome,
        COALESCE(um.codigo, p.unidade_distribuicao, 'UN') as unidade,
        ec.created_at
      FROM estoque_central ec
      JOIN produtos p ON ec.produto_id = p.id
      LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
      WHERE LOWER(p.nome) LIKE '%leite%'
      ORDER BY p.nome
    `);

    if (estoqueResult.rows.length > 0) {
      console.log('📦 Estoque central:\n');
      estoqueResult.rows.forEach(item => {
        console.log(`Produto: ${item.produto_nome} (ID: ${item.produto_id})`);
        console.log(`Unidade: ${item.unidade}`);
        console.log(`Estoque ID: ${item.estoque_id}`);
        console.log('---');
      });
    } else {
      console.log('❌ Nenhum estoque de leite encontrado');
    }

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

verificarLeite();
