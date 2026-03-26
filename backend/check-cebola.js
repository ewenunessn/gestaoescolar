const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function verificarCebola() {
  console.log('\n🔍 Verificando produto Cebola...\n');

  try {
    // Buscar Cebola
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
      WHERE LOWER(p.nome) LIKE '%cebola%'
      ORDER BY p.nome
    `);

    if (result.rows.length === 0) {
      console.log('❌ Nenhum produto com "cebola" encontrado');
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

    // Verificar se há pedidos com cebola
    console.log('\n🔍 Verificando pedidos com cebola...\n');
    
    const pedidosResult = await pool.query(`
      SELECT 
        pi.id as pedido_item_id,
        p.numero as pedido_numero,
        prod.id as produto_id,
        prod.nome as produto_nome,
        COALESCE(um.codigo, prod.unidade_distribuicao, 'UN') as unidade,
        pi.quantidade
      FROM pedido_itens pi
      JOIN pedidos p ON pi.pedido_id = p.id
      JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
      JOIN produtos prod ON cp.produto_id = prod.id
      LEFT JOIN unidades_medida um ON prod.unidade_medida_id = um.id
      WHERE LOWER(prod.nome) LIKE '%cebola%'
      ORDER BY p.numero DESC
      LIMIT 5
    `);

    if (pedidosResult.rows.length > 0) {
      console.log('📋 Pedidos com cebola:\n');
      pedidosResult.rows.forEach(item => {
        console.log(`Pedido: ${item.pedido_numero}`);
        console.log(`Produto: ${item.produto_nome} (ID: ${item.produto_id})`);
        console.log(`Unidade: ${item.unidade}`);
        console.log(`Quantidade: ${item.quantidade}`);
        console.log('---');
      });
    } else {
      console.log('❌ Nenhum pedido com cebola encontrado');
    }

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

verificarCebola();
