const db = require('../dist/database');

async function aplicarViews() {
  console.log('🚀 Criando views para tipo de fornecedor\n');

  const sql = `
    -- View 1: Resumo de compras por tipo de fornecedor em um pedido
    CREATE OR REPLACE VIEW vw_pedido_resumo_tipo_fornecedor AS
    SELECT 
      p.id as pedido_id,
      p.numero as pedido_numero,
      f.tipo_fornecedor,
      COUNT(DISTINCT pi.id) as total_itens,
      COUNT(DISTINCT f.id) as total_fornecedores,
      SUM(pi.quantidade) as quantidade_total,
      SUM(pi.quantidade * pi.preco_unitario) as valor_total
    FROM pedidos p
    INNER JOIN pedido_itens pi ON p.id = pi.pedido_id
    INNER JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
    INNER JOIN contratos c ON cp.contrato_id = c.id
    INNER JOIN fornecedores f ON c.fornecedor_id = f.id
    GROUP BY p.id, p.numero, f.tipo_fornecedor
    ORDER BY p.id, f.tipo_fornecedor;

    -- View 2: Resumo de faturamento por tipo de fornecedor e modalidade
    CREATE OR REPLACE VIEW vw_faturamento_tipo_fornecedor_modalidade AS
    SELECT 
      fp.id as faturamento_id,
      fp.pedido_id,
      p.numero as pedido_numero,
      f.tipo_fornecedor,
      m.id as modalidade_id,
      m.nome as modalidade_nome,
      COUNT(DISTINCT fi.id) as total_itens,
      COUNT(DISTINCT f.id) as total_fornecedores,
      SUM(fi.quantidade_alocada) as quantidade_total,
      SUM(fi.quantidade_alocada * fi.preco_unitario) as valor_total
    FROM faturamentos_pedidos fp
    INNER JOIN pedidos p ON fp.pedido_id = p.id
    INNER JOIN faturamentos_itens fi ON fp.id = fi.faturamento_pedido_id
    INNER JOIN modalidades m ON fi.modalidade_id = m.id
    INNER JOIN pedido_itens pi ON fi.pedido_item_id = pi.id
    INNER JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
    INNER JOIN contratos c ON cp.contrato_id = c.id
    INNER JOIN fornecedores f ON c.fornecedor_id = f.id
    GROUP BY fp.id, fp.pedido_id, p.numero, f.tipo_fornecedor, m.id, m.nome
    ORDER BY fp.id, f.tipo_fornecedor, m.nome;

    -- View 3: Detalhamento completo de faturamento com tipo de fornecedor
    CREATE OR REPLACE VIEW vw_faturamento_detalhado_tipo_fornecedor AS
    SELECT 
      fp.id as faturamento_id,
      fp.pedido_id,
      p.numero as pedido_numero,
      fp.data_faturamento,
      f.id as fornecedor_id,
      f.nome as fornecedor_nome,
      f.cnpj as fornecedor_cnpj,
      f.tipo_fornecedor,
      m.id as modalidade_id,
      m.nome as modalidade_nome,
      m.valor_repasse as modalidade_repasse,
      prod.id as produto_id,
      prod.nome as produto_nome,
      prod.unidade,
      c.numero as contrato_numero,
      fi.quantidade_alocada,
      fi.preco_unitario,
      (fi.quantidade_alocada * fi.preco_unitario) as valor_total
    FROM faturamentos_pedidos fp
    INNER JOIN pedidos p ON fp.pedido_id = p.id
    INNER JOIN faturamentos_itens fi ON fp.id = fi.faturamento_pedido_id
    INNER JOIN modalidades m ON fi.modalidade_id = m.id
    INNER JOIN pedido_itens pi ON fi.pedido_item_id = pi.id
    INNER JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
    INNER JOIN contratos c ON cp.contrato_id = c.id
    INNER JOIN fornecedores f ON c.fornecedor_id = f.id
    INNER JOIN produtos prod ON cp.produto_id = prod.id
    ORDER BY fp.id, f.tipo_fornecedor, m.nome, prod.nome;
  `;

  try {
    await db.query(sql);
    console.log('✅ Views criadas com sucesso!\n');

    // Testar views
    console.log('🔍 Testando view vw_pedido_resumo_tipo_fornecedor:');
    const pedidos = await db.query('SELECT * FROM vw_pedido_resumo_tipo_fornecedor LIMIT 3');
    console.log(pedidos.rows);

    console.log('\n🔍 Testando view vw_faturamento_tipo_fornecedor_modalidade:');
    const faturamentos = await db.query('SELECT * FROM vw_faturamento_tipo_fornecedor_modalidade LIMIT 3');
    console.log(faturamentos.rows);

  } catch (error) {
    console.error('❌ Erro ao criar views:', error.message);
  }

  process.exit(0);
}

aplicarViews();
