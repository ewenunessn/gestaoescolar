/**
 * Renomeia colunas em contrato_produtos:
 *   peso   -> peso_embalagem
 *   unidade -> unidade_compra
 * (marca permanece igual)
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    // Verificar estado atual
    const cols = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'contrato_produtos' 
      ORDER BY ordinal_position
    `);
    console.log('Colunas atuais:', cols.rows.map(r => r.column_name).join(', '));

    await client.query('BEGIN');

    // Renomear peso -> peso_embalagem (se ainda não foi renomeado)
    const temPeso = cols.rows.find(r => r.column_name === 'peso');
    const temPesoEmbalagem = cols.rows.find(r => r.column_name === 'peso_embalagem');
    if (temPeso && !temPesoEmbalagem) {
      await client.query(`ALTER TABLE contrato_produtos RENAME COLUMN peso TO peso_embalagem`);
      console.log('✅ peso -> peso_embalagem');
    } else if (temPesoEmbalagem) {
      console.log('⏭️  peso_embalagem já existe');
    } else {
      await client.query(`ALTER TABLE contrato_produtos ADD COLUMN IF NOT EXISTS peso_embalagem DECIMAL(10,3)`);
      console.log('✅ peso_embalagem adicionada');
    }

    // Renomear unidade -> unidade_compra (se ainda não foi renomeado)
    const temUnidade = cols.rows.find(r => r.column_name === 'unidade');
    const temUnidadeCompra = cols.rows.find(r => r.column_name === 'unidade_compra');
    if (temUnidade && !temUnidadeCompra) {
      await client.query(`ALTER TABLE contrato_produtos RENAME COLUMN unidade TO unidade_compra`);
      console.log('✅ unidade -> unidade_compra');
    } else if (temUnidadeCompra) {
      console.log('⏭️  unidade_compra já existe');
    } else {
      await client.query(`ALTER TABLE contrato_produtos ADD COLUMN IF NOT EXISTS unidade_compra VARCHAR(50)`);
      console.log('✅ unidade_compra adicionada');
    }

    // Atualizar views que referenciam cp.unidade -> cp.unidade_compra
    const viewsParaAtualizar = [
      {
        name: 'vw_recebimentos_detalhados',
        sql: `
CREATE OR REPLACE VIEW vw_recebimentos_detalhados AS
SELECT r.id, r.pedido_id, r.pedido_item_id, r.quantidade_recebida, r.data_recebimento,
    r.observacoes, r.usuario_id, u.nome AS usuario_nome, p.numero AS pedido_numero,
    p.status AS pedido_status, pi.quantidade AS quantidade_pedida, pi.preco_unitario,
    pi.valor_total AS valor_item, prod.nome AS produto_nome,
    COALESCE(cp.unidade_compra, 'UN') AS produto_unidade,
    f.nome AS fornecedor_nome, f.cnpj AS fornecedor_cnpj, c.numero AS contrato_numero,
    (SELECT COALESCE(sum(rec.quantidade_recebida), 0) FROM recebimentos rec WHERE rec.pedido_item_id = r.pedido_item_id) AS total_recebido_item,
    (pi.quantidade - (SELECT COALESCE(sum(rec.quantidade_recebida), 0) FROM recebimentos rec WHERE rec.pedido_item_id = r.pedido_item_id)) AS saldo_pendente
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
SELECT fp.id AS faturamento_id, fp.pedido_id, p.numero AS pedido_numero, p.data_pedido,
    p.competencia_mes_ano, fp.data_faturamento, fp.observacoes AS faturamento_observacoes,
    u.nome AS usuario_nome, fi.id AS item_id, fi.pedido_item_id, fi.modalidade_id,
    m.nome AS modalidade_nome, m.valor_repasse AS modalidade_repasse, fi.quantidade_alocada,
    fi.preco_unitario, fi.valor_total, prod.id AS produto_id, prod.nome AS produto_nome,
    COALESCE(cp.unidade_compra, 'UN') AS unidade,
    pi.quantidade AS quantidade_pedido, c.numero AS contrato_numero,
    f.nome AS fornecedor_nome, f.cnpj AS fornecedor_cnpj
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
SELECT fp.id AS faturamento_id, fp.pedido_id, p.numero AS pedido_numero, fp.data_faturamento,
    f.id AS fornecedor_id, f.nome AS fornecedor_nome, f.cnpj AS fornecedor_cnpj, f.tipo_fornecedor,
    m.id AS modalidade_id, m.nome AS modalidade_nome, m.valor_repasse AS modalidade_repasse,
    prod.id AS produto_id, prod.nome AS produto_nome,
    COALESCE(cp.unidade_compra, 'UN') AS unidade,
    c.numero AS contrato_numero, fi.quantidade_alocada, fi.preco_unitario,
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

    for (const v of viewsParaAtualizar) {
      try {
        await client.query(`DROP VIEW IF EXISTS ${v.name} CASCADE`);
        await client.query(v.sql);
        console.log(`✅ View ${v.name} atualizada`);
      } catch (e) {
        console.log(`⚠️  View ${v.name}: ${e.message}`);
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ Migration concluída!');

    // Confirmar resultado
    const after = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'contrato_produtos' 
      ORDER BY ordinal_position
    `);
    console.log('Colunas finais em contrato_produtos:', after.rows.map(r => r.column_name).join(', '));

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Erro:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
