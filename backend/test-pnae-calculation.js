// Script para testar cálculo de percentual PNAE
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false
});

async function testCalculation() {
  try {
    console.log('🧪 TESTE DE CÁLCULO PNAE\n');
    console.log('='.repeat(60));
    
    // 1. Verificar fornecedores AF
    console.log('\n1️⃣ FORNECEDORES DE AGRICULTURA FAMILIAR:');
    const fornecedoresAF = await pool.query(`
      SELECT id, nome, tipo_fornecedor, dap_caf
      FROM fornecedores
      WHERE tipo_fornecedor IN ('AGRICULTURA_FAMILIAR', 'COOPERATIVA_AF', 'ASSOCIACAO_AF')
    `);
    
    if (fornecedoresAF.rows.length === 0) {
      console.log('   ⚠️  Nenhum fornecedor de agricultura familiar cadastrado');
      console.log('   💡 Cadastre fornecedores com tipo AGRICULTURA_FAMILIAR');
    } else {
      fornecedoresAF.rows.forEach(f => {
        console.log(`   ✓ ${f.nome} (ID: ${f.id}) - ${f.tipo_fornecedor}`);
      });
    }
    
    // 2. Verificar contratos desses fornecedores
    console.log('\n2️⃣ CONTRATOS COM FORNECEDORES AF:');
    const contratos = await pool.query(`
      SELECT c.id, c.numero, f.nome as fornecedor_nome, f.tipo_fornecedor
      FROM contratos c
      JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE f.tipo_fornecedor IN ('AGRICULTURA_FAMILIAR', 'COOPERATIVA_AF', 'ASSOCIACAO_AF')
    `);
    
    if (contratos.rows.length === 0) {
      console.log('   ⚠️  Nenhum contrato com fornecedores AF');
      console.log('   💡 Crie contratos vinculados aos fornecedores AF');
    } else {
      contratos.rows.forEach(c => {
        console.log(`   ✓ Contrato ${c.numero} - ${c.fornecedor_nome}`);
      });
    }
    
    // 3. Verificar pedidos
    console.log('\n3️⃣ PEDIDOS DO ANO ATUAL:');
    const anoAtual = new Date().getFullYear();
    const pedidos = await pool.query(`
      SELECT 
        COUNT(*) as total_pedidos,
        SUM(valor_total) as valor_total
      FROM pedidos
      WHERE EXTRACT(YEAR FROM data_pedido) = $1
    `, [anoAtual]);
    
    console.log(`   Total de pedidos ${anoAtual}: ${pedidos.rows[0].total_pedidos}`);
    console.log(`   Valor total: R$ ${parseFloat(pedidos.rows[0].valor_total || 0).toFixed(2)}`);
    
    // 4. Testar a view de cálculo
    console.log('\n4️⃣ CÁLCULO VIA VIEW (vw_pnae_agricultura_familiar):');
    const viewResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT pedido_id) as total_pedidos,
        SUM(valor_itens) as valor_total,
        SUM(valor_agricultura_familiar) as valor_af,
        ROUND(
          (SUM(valor_agricultura_familiar) / NULLIF(SUM(valor_itens), 0) * 100)::numeric, 
          2
        ) as percentual_af
      FROM vw_pnae_agricultura_familiar
      WHERE EXTRACT(YEAR FROM data_pedido) = $1
    `, [anoAtual]);
    
    const resultado = viewResult.rows[0];
    console.log(`   Pedidos analisados: ${resultado.total_pedidos || 0}`);
    console.log(`   Valor total: R$ ${parseFloat(resultado.valor_total || 0).toFixed(2)}`);
    console.log(`   Valor AF: R$ ${parseFloat(resultado.valor_af || 0).toFixed(2)}`);
    console.log(`   Percentual AF: ${resultado.percentual_af || 0}%`);
    
    // 5. Verificar se atende requisito
    console.log('\n5️⃣ CONFORMIDADE PNAE:');
    const percentual = parseFloat(resultado.percentual_af || 0);
    if (percentual >= 30) {
      console.log(`   ✅ ATENDE o requisito de 30% (${percentual}%)`);
    } else if (percentual > 0) {
      console.log(`   ⚠️  NÃO ATENDE o requisito de 30% (atual: ${percentual}%)`);
      console.log(`   💡 Faltam ${(30 - percentual).toFixed(2)}% para atingir a meta`);
    } else {
      console.log(`   ❌ Sem dados para calcular`);
    }
    
    // 6. Diagnóstico
    console.log('\n6️⃣ DIAGNÓSTICO:');
    if (fornecedoresAF.rows.length === 0) {
      console.log('   📝 PASSO 1: Cadastre fornecedores de agricultura familiar');
      console.log('      - Acesse: Fornecedores > Novo Fornecedor');
      console.log('      - Tipo: Agricultura Familiar');
      console.log('      - Preencha DAP/CAF e validade');
    } else if (contratos.rows.length === 0) {
      console.log('   📝 PASSO 2: Crie contratos com fornecedores AF');
      console.log('      - Acesse: Contratos > Novo Contrato');
      console.log('      - Selecione um fornecedor AF');
    } else if (parseInt(pedidos.rows[0].total_pedidos) === 0) {
      console.log('   📝 PASSO 3: Crie pedidos usando os contratos AF');
      console.log('      - Acesse: Compras > Novo Pedido');
      console.log('      - Use contratos de fornecedores AF');
    } else {
      console.log('   ✅ Sistema configurado corretamente!');
      console.log('   📊 Acesse o dashboard: /pnae/dashboard');
    }
    
    console.log('\n' + '='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

testCalculation();
