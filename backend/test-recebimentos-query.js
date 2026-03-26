require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testQuery() {
  try {
    console.log('\n🔍 Testando query de recebimentos...\n');
    
    // Primeiro, vamos ver se existem pedidos
    const pedidos = await pool.query(`
      SELECT id, numero, status 
      FROM pedidos 
      WHERE status IN ('pendente', 'recebido_parcial', 'concluido')
      ORDER BY id DESC 
      LIMIT 5
    `);
    
    console.log('📦 Pedidos encontrados:');
    pedidos.rows.forEach(p => {
      console.log(`  - ID: ${p.id}, Número: ${p.numero}, Status: ${p.status}`);
    });
    
    if (pedidos.rows.length === 0) {
      console.log('\n❌ Nenhum pedido encontrado!');
      await pool.end();
      return;
    }
    
    const pedidoId = pedidos.rows[0].id;
    console.log(`\n🔍 Testando com pedido ID: ${pedidoId}\n`);
    
    // Buscar fornecedores do pedido
    const fornecedores = await pool.query(`
      SELECT DISTINCT
        f.id,
        f.nome,
        f.cnpj,
        COUNT(DISTINCT pi.id) as total_itens
      FROM fornecedores f
      JOIN contratos c ON f.id = c.fornecedor_id
      JOIN contrato_produtos cp ON c.id = cp.contrato_id
      JOIN pedido_itens pi ON cp.id = pi.contrato_produto_id
      WHERE pi.pedido_id = $1
      GROUP BY f.id, f.nome, f.cnpj
      ORDER BY f.nome
    `, [pedidoId]);
    
    console.log('🏢 Fornecedores do pedido:');
    fornecedores.rows.forEach(f => {
      console.log(`  - ID: ${f.id}, Nome: ${f.nome}, Itens: ${f.total_itens}`);
    });
    
    if (fornecedores.rows.length === 0) {
      console.log('\n❌ Nenhum fornecedor encontrado para este pedido!');
      await pool.end();
      return;
    }
    
    const fornecedorId = fornecedores.rows[0].id;
    console.log(`\n🔍 Testando itens do fornecedor ID: ${fornecedorId}\n`);
    
    // Testar a query problemática
    console.log('📝 Executando query de itens...\n');
    const itens = await pool.query(`
      SELECT 
        pi.id,
        pi.quantidade,
        pi.preco_unitario,
        pi.valor_total,
        pi.data_entrega_prevista,
        pi.observacoes,
        prod.id as produto_id,
        prod.nome as produto_nome,
        prod.unidade_medida_id,
        prod.unidade_distribuicao,
        um.id as um_id,
        um.codigo as um_codigo,
        COALESCE(um.codigo, prod.unidade_distribuicao, 'UN') as unidade,
        c.numero as contrato_numero,
        COALESCE(SUM(r.quantidade_recebida), 0) as quantidade_recebida,
        (pi.quantidade - COALESCE(SUM(r.quantidade_recebida), 0)) as saldo_pendente,
        COUNT(r.id) as total_recebimentos
      FROM pedido_itens pi
      JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
      JOIN produtos prod ON cp.produto_id = prod.id
      LEFT JOIN unidades_medida um ON prod.unidade_medida_id = um.id
      JOIN contratos c ON cp.contrato_id = c.id
      LEFT JOIN recebimentos r ON pi.id = r.pedido_item_id
      WHERE pi.pedido_id = $1 AND c.fornecedor_id = $2
      GROUP BY pi.id, pi.quantidade, pi.preco_unitario, pi.valor_total, 
               pi.data_entrega_prevista, pi.observacoes, prod.id, prod.nome, 
               prod.unidade_medida_id, prod.unidade_distribuicao,
               um.id, um.codigo, c.numero
      ORDER BY pi.data_entrega_prevista ASC NULLS LAST, prod.nome
    `, [pedidoId, fornecedorId]);
    
    console.log('✅ Query executada com sucesso!\n');
    console.log(`📦 Itens encontrados: ${itens.rows.length}\n`);
    
    itens.rows.forEach((item, index) => {
      console.log(`${index + 1}. ${item.produto_nome}`);
      console.log(`   - Unidade Medida ID: ${item.unidade_medida_id}`);
      console.log(`   - Unidade Distribuição: ${item.unidade_distribuicao}`);
      console.log(`   - UM ID: ${item.um_id}`);
      console.log(`   - UM Código: ${item.um_codigo}`);
      console.log(`   - Unidade Final: ${item.unidade}`);
      console.log(`   - Quantidade: ${item.quantidade}`);
      console.log(`   - Saldo Pendente: ${item.saldo_pendente}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('\n❌ Erro ao executar query:', error.message);
    console.error('\nDetalhes:', error);
  } finally {
    await pool.end();
  }
}

testQuery();
