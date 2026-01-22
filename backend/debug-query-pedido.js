const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'alimentacao_escolar',
  password: 'admin123',
  port: 5432,
});

async function debugQueryPedido() {
  try {
    console.log('🔍 Testando a query do buscarPedido...\n');

    // Primeiro, encontrar um pedido com Arroz
    const pedidoResult = await pool.query(`
      SELECT pi.id, pi.pedido_id, pi.contrato_produto_id, p.nome as produto_nome
      FROM pedido_itens pi
      JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
      JOIN produtos p ON cp.produto_id = p.id
      WHERE p.nome ILIKE '%arroz%'
      LIMIT 1
    `);

    if (pedidoResult.rows.length === 0) {
      console.log('❌ Nenhum pedido com Arroz encontrado');
      await pool.end();
      return;
    }

    const pedidoItem = pedidoResult.rows[0];
    console.log('📦 Pedido Item encontrado:', pedidoItem);

    // Testar a query completa
    const queryCompleta = `
      SELECT 
        pi.*,
        p.nome as produto_nome,
        COALESCE(cp.unidade, 'Kg') as unidade,
        cp.quantidade_contratada,
        cp.preco_unitario as preco_contrato,
        c.numero as contrato_numero,
        c.id as contrato_id,
        f.nome as fornecedor_nome,
        f.cnpj as fornecedor_cnpj,
        f.id as fornecedor_id,
        (pi.quantidade * pi.preco_unitario) as valor_total,
        COALESCE(
          (SELECT SUM(cpm2.quantidade_disponivel) 
           FROM contrato_produtos_modalidades cpm2 
           WHERE cpm2.contrato_produto_id = cp.id AND cpm2.ativo = true),
          0
        ) as saldo_disponivel
      FROM pedido_itens pi
      LEFT JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
      LEFT JOIN produtos p ON cp.produto_id = p.id
      LEFT JOIN contratos c ON cp.contrato_id = c.id
      LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE pi.pedido_id = $1
      ORDER BY p.nome
    `;

    const resultado = await pool.query(queryCompleta, [pedidoItem.pedido_id]);
    
    console.log('\n📊 Resultado da query:');
    console.table(resultado.rows.map(r => ({
      produto: r.produto_nome,
      contrato_produto_id: r.contrato_produto_id,
      saldo_disponivel: r.saldo_disponivel,
      quantidade: r.quantidade,
      preco_unitario: r.preco_unitario
    })));

    // Verificar diretamente as modalidades
    console.log('\n🔍 Verificando modalidades para contrato_produto_id:', pedidoItem.contrato_produto_id);
    const modalidadesResult = await pool.query(`
      SELECT id, modalidade_id, quantidade_inicial, quantidade_consumida, quantidade_disponivel, ativo
      FROM contrato_produtos_modalidades
      WHERE contrato_produto_id = $1
    `, [pedidoItem.contrato_produto_id]);

    console.log('📊 Modalidades encontradas:');
    console.table(modalidadesResult.rows);

    // Testar a subquery isoladamente
    const subqueryResult = await pool.query(`
      SELECT SUM(quantidade_disponivel) as soma
      FROM contrato_produtos_modalidades
      WHERE contrato_produto_id = $1 AND ativo = true
    `, [pedidoItem.contrato_produto_id]);

    console.log('\n✅ Resultado da subquery isolada:', subqueryResult.rows[0]);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

debugQueryPedido();
