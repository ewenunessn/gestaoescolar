require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false
});

async function testDashboard() {
  try {
    console.log('🧪 Testando cálculo do Dashboard PNAE\n');
    
    const anoAtual = new Date().getFullYear();
    
    // 1. Valor recebido do FNDE
    console.log('1️⃣ Valor recebido do FNDE (soma dos repasses x parcelas):');
    const valorRecebidoQuery = `
      SELECT 
        id,
        nome,
        valor_repasse,
        COALESCE(parcelas, 1) as parcelas,
        ativo
      FROM modalidades
      WHERE ativo = true
    `;
    const modalidades = await pool.query(valorRecebidoQuery);
    
    let totalFNDE = 0;
    modalidades.rows.forEach(m => {
      const valorRepasse = parseFloat(m.valor_repasse || 0);
      const parcelas = parseInt(m.parcelas || 1);
      const valorTotal = valorRepasse * parcelas;
      totalFNDE += valorTotal;
      console.log(`   ${m.nome}: R$ ${valorRepasse.toFixed(2)} x ${parcelas} parcelas = R$ ${valorTotal.toFixed(2)}`);
    });
    console.log(`   TOTAL FNDE: R$ ${totalFNDE.toFixed(2)}\n`);
    
    // 2. Valores de Agricultura Familiar
    console.log('2️⃣ Valores de Agricultura Familiar:');
    const afQuery = `
      SELECT 
        SUM(valor_itens) as valor_total,
        SUM(valor_agricultura_familiar) as valor_af,
        COUNT(DISTINCT pedido_id) as total_pedidos
      FROM vw_pnae_agricultura_familiar
      WHERE EXTRACT(YEAR FROM data_pedido) = $1
    `;
    const afResult = await pool.query(afQuery, [anoAtual]);
    const valorAF = parseFloat(afResult.rows[0].valor_af || 0);
    const valorTotal = parseFloat(afResult.rows[0].valor_total || 0);
    const totalPedidos = parseInt(afResult.rows[0].total_pedidos || 0);
    
    console.log(`   Valor total de pedidos: R$ ${valorTotal.toFixed(2)}`);
    console.log(`   Valor AF: R$ ${valorAF.toFixed(2)}`);
    console.log(`   Total de pedidos: ${totalPedidos}\n`);
    
    // 3. Cálculos
    console.log('3️⃣ Cálculos PNAE:');
    // Lei nº 15.226/2025: aumentou de 30% para 45% a partir de 2026
    const percentualMinimoObrigatorio = 45;
    const percentualAF = totalFNDE > 0 ? (valorAF / totalFNDE * 100) : 0;
    const valorMinimoObrigatorio = totalFNDE * percentualMinimoObrigatorio / 100;
    const valorFaltante = Math.max(0, valorMinimoObrigatorio - valorAF);
    
    console.log(`   Percentual mínimo obrigatório: ${percentualMinimoObrigatorio}% (Lei 15.226/2025)`);
    console.log(`   Valor mínimo obrigatório: R$ ${valorMinimoObrigatorio.toFixed(2)}`);
    console.log(`   Percentual AF atual: ${percentualAF.toFixed(2)}%`);
    console.log(`   Valor faltante: R$ ${valorFaltante.toFixed(2)}`);
    console.log(`   Status: ${percentualAF >= percentualMinimoObrigatorio ? '✅ ATENDE' : '❌ NÃO ATENDE'}\n`);
    
    // 4. Exemplo prático
    console.log('4️⃣ Exemplo prático:');
    console.log(`   Se o município recebe R$ ${totalFNDE.toFixed(2)} do FNDE,`);
    console.log(`   deve gastar no mínimo R$ ${valorMinimoObrigatorio.toFixed(2)} (${percentualMinimoObrigatorio}%) com AF.`);
    console.log(`   Atualmente gastou R$ ${valorAF.toFixed(2)} com AF.`);
    if (valorFaltante > 0) {
      console.log(`   Faltam R$ ${valorFaltante.toFixed(2)} para atingir a meta.\n`);
    } else {
      console.log(`   Meta atingida! ✅\n`);
    }
    
    // 5. Evolução mensal
    console.log('5️⃣ Evolução mensal:');
    const evolucaoQuery = `
      SELECT 
        EXTRACT(MONTH FROM data_pedido) as mes,
        TO_CHAR(data_pedido, 'Mon/YY') as mes_nome,
        SUM(valor_itens) as valor_total,
        SUM(valor_agricultura_familiar) as valor_af
      FROM vw_pnae_agricultura_familiar
      WHERE EXTRACT(YEAR FROM data_pedido) = $1
      GROUP BY EXTRACT(MONTH FROM data_pedido), TO_CHAR(data_pedido, 'Mon/YY')
      ORDER BY mes
    `;
    const evolucao = await pool.query(evolucaoQuery, [anoAtual]);
    
    evolucao.rows.forEach(row => {
      const vAF = parseFloat(row.valor_af || 0);
      const pctAF = totalFNDE > 0 ? (vAF / totalFNDE * 100) : 0;
      console.log(`   ${row.mes_nome}: R$ ${vAF.toFixed(2)} (${pctAF.toFixed(2)}%)`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

testDashboard();
