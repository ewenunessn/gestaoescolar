require('dotenv').config({ path: 'backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon') ? { rejectUnauthorized: false } : false
});

async function testar() {
  const client = await pool.connect();
  try {
    console.log('🔍 Testando detecção de produtos em múltiplos contratos...\n');

    // 1. Buscar produtos que aparecem em mais de um contrato ativo
    const result = await client.query(`
      SELECT 
        p.id as produto_id,
        p.nome as produto_nome,
        COUNT(DISTINCT cp.contrato_id) as num_contratos,
        json_agg(json_build_object(
          'contrato_produto_id', cp.id,
          'contrato_id', cp.contrato_id,
          'contrato_numero', c.numero,
          'fornecedor_nome', f.nome,
          'preco_unitario', cp.preco_unitario,
          'quantidade_contratada', cp.quantidade_contratada,
          'quantidade_consumida', cp.quantidade_consumida,
          'saldo_disponivel', COALESCE(
            (SELECT SUM(cpm.quantidade_inicial - cpm.quantidade_consumida)
             FROM contrato_produtos_modalidades cpm
             WHERE cpm.contrato_produto_id = cp.id AND cpm.ativo = true),
            cp.quantidade_contratada
          ),
          'data_fim', c.data_fim
        ) ORDER BY c.data_fim ASC) as contratos
      FROM produtos p
      INNER JOIN contrato_produtos cp ON cp.produto_id = p.id AND cp.ativo = true
      INNER JOIN contratos c ON c.id = cp.contrato_id AND c.status = 'ativo' AND c.data_fim >= CURRENT_DATE
      INNER JOIN fornecedores f ON f.id = c.fornecedor_id
      GROUP BY p.id, p.nome
      HAVING COUNT(DISTINCT cp.contrato_id) > 1
      ORDER BY p.nome
    `);

    if (result.rows.length === 0) {
      console.log('❌ Nenhum produto encontrado em múltiplos contratos ativos');
      console.log('\n📊 Verificando contratos ativos...');
      
      const contratosAtivos = await client.query(`
        SELECT 
          c.id,
          c.numero,
          c.status,
          c.data_fim,
          f.nome as fornecedor,
          COUNT(cp.id) as num_produtos
        FROM contratos c
        INNER JOIN fornecedores f ON f.id = c.fornecedor_id
        LEFT JOIN contrato_produtos cp ON cp.contrato_id = c.id AND cp.ativo = true
        WHERE c.status = 'ativo' AND c.data_fim >= CURRENT_DATE
        GROUP BY c.id, c.numero, c.status, c.data_fim, f.nome
        ORDER BY c.data_fim DESC
      `);
      
      console.log(`\n✅ ${contratosAtivos.rows.length} contrato(s) ativo(s):`);
      contratosAtivos.rows.forEach(c => {
        console.log(`  - ${c.numero} (${c.fornecedor}) - ${c.num_produtos} produtos - Válido até ${c.data_fim}`);
      });
      
      return;
    }

    console.log(`✅ ${result.rows.length} produto(s) em múltiplos contratos:\n`);

    result.rows.forEach((produto, idx) => {
      console.log(`${idx + 1}. ${produto.produto_nome} (ID: ${produto.produto_id})`);
      console.log(`   📦 ${produto.num_contratos} contratos ativos:`);
      
      produto.contratos.forEach((contrato, cIdx) => {
        console.log(`   ${cIdx + 1}. Contrato ${contrato.contrato_numero}`);
        console.log(`      Fornecedor: ${contrato.fornecedor_nome}`);
        console.log(`      Preço: R$ ${parseFloat(contrato.preco_unitario).toFixed(2)}/kg`);
        console.log(`      Quantidade contratada: ${parseFloat(contrato.quantidade_contratada).toFixed(2)} kg`);
        console.log(`      Saldo disponível: ${parseFloat(contrato.saldo_disponivel).toFixed(2)} kg`);
        console.log(`      Válido até: ${contrato.data_fim}`);
      });
      console.log('');
    });

    // 2. Simular uma requisição de geração de pedido
    console.log('\n🧪 Simulando geração de pedido...');
    console.log('Quando você tentar gerar um pedido com esses produtos,');
    console.log('o sistema deve detectar múltiplos contratos e abrir o dialog de seleção.\n');

    // 3. Verificar se há guias de demanda para testar
    const guias = await client.query(`
      SELECT 
        g.id,
        g.nome,
        g.competencia_mes_ano,
        g.status,
        COUNT(DISTINCT gi.produto_id) as num_produtos
      FROM guias_demanda g
      LEFT JOIN guia_demanda_itens gi ON gi.guia_id = g.id
      WHERE g.status = 'aberta'
      GROUP BY g.id, g.nome, g.competencia_mes_ano, g.status
      ORDER BY g.id DESC
      LIMIT 5
    `);

    if (guias.rows.length > 0) {
      console.log('📋 Guias de demanda disponíveis para teste:');
      guias.rows.forEach(g => {
        console.log(`  - Guia #${g.id}: ${g.nome || g.competencia_mes_ano} (${g.num_produtos} produtos)`);
      });
      console.log('\n💡 Use uma dessas guias para testar a seleção de contratos');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testar();
