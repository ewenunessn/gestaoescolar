require('dotenv').config({ path: 'backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function verificar() {
  const client = await pool.connect();
  try {
    console.log('🔍 Verificando se Alho está em alguma guia...\n');

    // 1. Buscar o ID do Alho
    const alhoResult = await client.query(`
      SELECT id, nome FROM produtos WHERE nome ILIKE '%alho%'
    `);

    if (alhoResult.rows.length === 0) {
      console.log('❌ Produto Alho não encontrado');
      return;
    }

    const alho = alhoResult.rows[0];
    console.log(`✅ Produto encontrado: ${alho.nome} (ID: ${alho.id})\n`);

    // 2. Verificar contratos do Alho
    const contratosResult = await client.query(`
      SELECT 
        cp.id as contrato_produto_id,
        c.numero as contrato_numero,
        f.nome as fornecedor_nome,
        cp.preco_unitario,
        c.status,
        c.data_fim
      FROM contrato_produtos cp
      INNER JOIN contratos c ON c.id = cp.contrato_id
      INNER JOIN fornecedores f ON f.id = c.fornecedor_id
      WHERE cp.produto_id = $1 AND cp.ativo = true
      ORDER BY c.data_fim DESC
    `, [alho.id]);

    console.log(`📦 ${contratosResult.rows.length} contrato(s) encontrado(s):\n`);
    contratosResult.rows.forEach((c, idx) => {
      console.log(`${idx + 1}. Contrato ${c.contrato_numero} - ${c.fornecedor_nome}`);
      console.log(`   Preço: R$ ${parseFloat(c.preco_unitario).toFixed(2)}/kg`);
      console.log(`   Status: ${c.status}`);
      console.log(`   Válido até: ${c.data_fim}`);
    });

    const contratosAtivos = contratosResult.rows.filter(c => 
      c.status === 'ativo' && new Date(c.data_fim) >= new Date()
    );

    console.log(`\n✅ ${contratosAtivos.length} contrato(s) ATIVO(S)\n`);

    // 3. Verificar se Alho está em alguma guia
    const guiasResult = await client.query(`
      SELECT 
        g.id,
        g.nome,
        g.competencia_mes_ano,
        g.status,
        SUM(gpe.quantidade) as quantidade_total,
        COUNT(DISTINCT gpe.escola_id) as num_escolas
      FROM guias g
      INNER JOIN guia_produto_escola gpe ON gpe.guia_id = g.id
      WHERE gpe.produto_id = $1
      GROUP BY g.id, g.nome, g.competencia_mes_ano, g.status
      ORDER BY g.id DESC
    `, [alho.id]);

    if (guiasResult.rows.length === 0) {
      console.log('❌ Alho não está em nenhuma guia');
      console.log('\n💡 SOLUÇÃO: Crie uma guia que inclua Alho para testar a seleção de contratos');
      console.log('   1. Vá em Planejamento de Compras');
      console.log('   2. Selecione uma competência');
      console.log('   3. Gere uma guia de demanda');
      console.log('   4. Certifique-se de que há cardápios com Alho');
      return;
    }

    console.log(`📋 ${guiasResult.rows.length} guia(s) com Alho:\n`);
    guiasResult.rows.forEach((g, idx) => {
      console.log(`${idx + 1}. Guia #${g.id} - ${g.nome || g.competencia_mes_ano}`);
      console.log(`   Status: ${g.status}`);
      console.log(`   Quantidade: ${parseFloat(g.quantidade_total).toFixed(2)} kg`);
      console.log(`   Escolas: ${g.num_escolas}`);
    });

    const guiasAbertas = guiasResult.rows.filter(g => g.status === 'aberta');
    
    if (guiasAbertas.length > 0) {
      console.log(`\n✅ ${guiasAbertas.length} guia(s) ABERTA(S) com Alho`);
      console.log('\n🎯 TESTE:');
      console.log(`   1. Acesse o Planejamento de Compras no Vercel`);
      console.log(`   2. Selecione a Guia #${guiasAbertas[0].id}`);
      console.log(`   3. Clique em "Gerar Pedido de Compra"`);
      console.log(`   4. O dialog de seleção DEVE abrir mostrando os ${contratosAtivos.length} contratos do Alho`);
    } else {
      console.log('\n⚠️  Todas as guias com Alho estão fechadas');
      console.log('   Você precisa criar uma nova guia ou reabrir uma existente');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

verificar();
