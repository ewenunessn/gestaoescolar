const db = require('../dist/database');

async function testarQuery() {
  console.log('🧪 Testando query de pedidos...\n');

  try {
    const result = await db.query(`
      SELECT 
        p.*,
        u.nome as usuario_criacao_nome,
        ua.nome as usuario_aprovacao_nome,
        COUNT(DISTINCT pi.id) as total_itens,
        COALESCE(SUM(pi.quantidade), 0) as quantidade_total,
        COUNT(DISTINCT c.fornecedor_id) as total_fornecedores,
        STRING_AGG(DISTINCT f.nome, ', ') as fornecedores_nomes
      FROM pedidos p
      JOIN usuarios u ON p.usuario_criacao_id = u.id
      LEFT JOIN usuarios ua ON p.usuario_aprovacao_id = ua.id
      LEFT JOIN pedido_itens pi ON p.id = pi.pedido_id
      LEFT JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
      LEFT JOIN contratos c ON cp.contrato_id = c.id
      LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE 1=1
      GROUP BY p.id, u.nome, ua.nome
      ORDER BY p.created_at DESC
      LIMIT 10
    `);

    console.log('✅ Query executada com sucesso!');
    console.log(`📦 Total de pedidos: ${result.rows.length}\n`);
    
    if (result.rows.length > 0) {
      console.log('📋 Primeiro pedido:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Erro na query:', error.message);
    console.error('Stack:', error.stack);
  }

  process.exit(0);
}

testarQuery();
