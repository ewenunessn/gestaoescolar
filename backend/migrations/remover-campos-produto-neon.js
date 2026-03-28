/**
 * Remove marca, peso e unidade da tabela produtos no Neon.
 * Recria as views dependentes usando cp.unidade (contrato_produtos) no lugar de p.unidade.
 */
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Views que usam p.unidade e precisam ser recriadas com COALESCE(cp.unidade, 'UN')
// Para views de estoque (sem contrato_produtos), usamos 'UN' como fallback
const views = [
  {
    name: 'vw_estoque_central_completo',
    sql: `
CREATE OR REPLACE VIEW vw_estoque_central_completo AS
SELECT ec.id,
    ec.produto_id,
    p.nome AS produto_nome,
    'UN'::varchar AS unidade,
    p.categoria,
    COALESCE(sum(ecl.quantidade), 0) AS quantidade,
    COALESCE(sum(ecl.quantidade_reservada), 0) AS quantidade_reservada,
    COALESCE(sum(ecl.quantidade_disponivel), 0) AS quantidade_disponivel,
    count(DISTINCT ecl.id) FILTER (WHERE ecl.quantidade > 0) AS total_lotes,
    min(ecl.data_validade) FILTER (WHERE ecl.quantidade > 0) AS proxima_validade,
    ec.created_at,
    ec.updated_at
FROM estoque_central ec
JOIN produtos p ON p.id = ec.produto_id
LEFT JOIN estoque_central_lotes ecl ON ecl.estoque_central_id = ec.id
GROUP BY ec.id, p.id, p.nome, p.categoria`
  },
  {
    name: 'vw_lotes_proximos_vencimento',
    sql: `
CREATE OR REPLACE VIEW vw_lotes_proximos_vencimento AS
SELECT ecl.id AS lote_id,
    ecl.lote,
    ecl.data_validade,
    ecl.quantidade,
    ecl.quantidade_disponivel,
    p.nome AS produto_nome,
    'UN'::varchar AS unidade,
    ec.id AS estoque_id,
    (ecl.data_validade - CURRENT_DATE) AS dias_para_vencer
FROM estoque_central_lotes ecl
JOIN estoque_central ec ON ec.id = ecl.estoque_central_id
JOIN produtos p ON p.id = ec.produto_id
WHERE ecl.quantidade > 0 AND ecl.data_validade >= CURRENT_DATE
ORDER BY ecl.data_validade`
  },
  {
    name: 'vw_estoque_baixo',
    sql: `
CREATE OR REPLACE VIEW vw_estoque_baixo AS
SELECT ec.id,
    p.nome AS produto_nome,
    'UN'::varchar AS unidade,
    COALESCE(sum(ecl.quantidade_disponivel), 0) AS quantidade_disponivel,
    count(DISTINCT ecl.id) FILTER (WHERE ecl.quantidade > 0) AS total_lotes
FROM estoque_central ec
JOIN produtos p ON p.id = ec.produto_id
LEFT JOIN estoque_central_lotes ecl ON ecl.estoque_central_id = ec.id
GROUP BY ec.id, p.id, p.nome
HAVING COALESCE(sum(ecl.quantidade_disponivel), 0) < 10`
  },
  {
    name: 'vw_recebimentos_detalhados',
    sql: `
CREATE OR REPLACE VIEW vw_recebimentos_detalhados AS
SELECT r.id,
    r.pedido_id,
    r.pedido_item_id,
    r.quantidade_recebida,
    r.data_recebimento,
    r.observacoes,
    r.usuario_id,
    u.nome AS usuario_nome,
    p.numero AS pedido_numero,
    p.status AS pedido_status,
    pi.quantidade AS quantidade_pedida,
    pi.preco_unitario,
    pi.valor_total AS valor_item,
    prod.nome AS produto_nome,
    COALESCE(cp.unidade, 'UN') AS produto_unidade,
    f.nome AS fornecedor_nome,
    f.cnpj AS fornecedor_cnpj,
    c.numero AS contrato_numero,
    (SELECT COALESCE(sum(rec.quantidade_recebida), 0)
     FROM recebimentos rec WHERE rec.pedido_item_id = r.pedido_item_id) AS total_recebido_item,
    (pi.quantidade - (SELECT COALESCE(sum(rec.quantidade_recebida), 0)
     FROM recebimentos rec WHERE rec.pedido_item_id = r.pedido_item_id)) AS saldo_pendente
FROM recebimentos r
JOIN usuarios u ON r.usuario_id = u.id
JOIN pedidos p ON r.pedido_id = p.id
JOIN pedido_itens pi ON r.pedido_item_id = pi.id
JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
JOIN produtos prod ON cp.produto_id = prod.id
JOIN contratos c ON cp.contrato_id = c.id
JOIN fornecedores f ON c.fornecedor_id = f.id`
  },
  {
    name: 'vw_faturamentos_detalhados',
    sql: `
CREATE OR REPLACE VIEW vw_faturamentos_detalhados AS
SELECT fp.id AS faturamento_id,
    fp.pedido_id,
    p.numero AS pedido_numero,
    p.data_pedido,
    p.competencia_mes_ano,
    fp.data_faturamento,
    fp.observacoes AS faturamento_observacoes,
    u.nome AS usuario_nome,
    fi.id AS item_id,
    fi.pedido_item_id,
    fi.modalidade_id,
    m.nome AS modalidade_nome,
    m.valor_repasse AS modalidade_repasse,
    fi.quantidade_alocada,
    fi.preco_unitario,
    fi.valor_total,
    prod.id AS produto_id,
    prod.nome AS produto_nome,
    COALESCE(cp.unidade, 'UN') AS unidade,
    pi.quantidade AS quantidade_pedido,
    c.numero AS contrato_numero,
    f.nome AS fornecedor_nome,
    f.cnpj AS fornecedor_cnpj
FROM faturamentos_pedidos fp
JOIN pedidos p ON fp.pedido_id = p.id
LEFT JOIN usuarios u ON fp.usuario_id = u.id
JOIN faturamentos_itens fi ON fp.id = fi.faturamento_pedido_id
JOIN modalidades m ON fi.modalidade_id = m.id
JOIN pedido_itens pi ON fi.pedido_item_id = pi.id
JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
JOIN produtos prod ON cp.produto_id = prod.id
JOIN contratos c ON cp.contrato_id = c.id
JOIN fornecedores f ON c.fornecedor_id = f.id
ORDER BY fp.data_faturamento DESC, fi.id`
  },
  {
    name: 'vw_faturamento_detalhado_tipo_fornecedor',
    sql: `
CREATE OR REPLACE VIEW vw_faturamento_detalhado_tipo_fornecedor AS
SELECT fp.id AS faturamento_id,
    fp.pedido_id,
    p.numero AS pedido_numero,
    fp.data_faturamento,
    f.id AS fornecedor_id,
    f.nome AS fornecedor_nome,
    f.cnpj AS fornecedor_cnpj,
    f.tipo_fornecedor,
    m.id AS modalidade_id,
    m.nome AS modalidade_nome,
    m.valor_repasse AS modalidade_repasse,
    prod.id AS produto_id,
    prod.nome AS produto_nome,
    COALESCE(cp.unidade, 'UN') AS unidade,
    c.numero AS contrato_numero,
    fi.quantidade_alocada,
    fi.preco_unitario,
    (fi.quantidade_alocada * fi.preco_unitario) AS valor_total
FROM faturamentos_pedidos fp
JOIN pedidos p ON fp.pedido_id = p.id
JOIN faturamentos_itens fi ON fp.id = fi.faturamento_pedido_id
JOIN modalidades m ON fi.modalidade_id = m.id
JOIN pedido_itens pi ON fi.pedido_item_id = pi.id
JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
JOIN contratos c ON cp.contrato_id = c.id
JOIN fornecedores f ON c.fornecedor_id = f.id
JOIN produtos prod ON cp.produto_id = prod.id
ORDER BY fp.id, f.tipo_fornecedor, m.nome, prod.nome`
  }
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Dropar views dependentes primeiro
    console.log('🗑️  Dropando views dependentes...');
    for (const v of views) {
      await client.query(`DROP VIEW IF EXISTS ${v.name} CASCADE`);
      console.log(`  ✅ ${v.name} dropada`);
    }

    // 2. Recriar views sem p.unidade
    console.log('\n🔄 Recriando views...');
    for (const v of views) {
      await client.query(v.sql);
      console.log(`  ✅ ${v.name} recriada`);
    }

    // 2. Remover colunas de produtos
    console.log('\n🗑️  Removendo colunas de produtos...');
    const toRemove = ['marca', 'peso', 'unidade'];
    for (const col of toRemove) {
      const exists = await client.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'produtos' AND column_name = $1
      `, [col]);
      if (exists.rows.length > 0) {
        await client.query(`ALTER TABLE produtos DROP COLUMN ${col} CASCADE`);
        console.log(`  ✅ ${col} removida`);
      } else {
        console.log(`  ⏭️  ${col} já não existe`);
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ Concluído com sucesso!');

    // 3. Confirmar colunas restantes
    const after = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'produtos' ORDER BY ordinal_position
    `);
    console.log('Colunas restantes em produtos:', after.rows.map(r => r.column_name).join(', '));

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro (rollback feito):', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
