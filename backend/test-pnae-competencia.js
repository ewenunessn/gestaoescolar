require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false
});

async function testCompetencia() {
  try {
    console.log('🧪 Testando agrupamento por competência\n');
    
    // Ver todos os pedidos com suas competências
    console.log('1️⃣ Pedidos e suas competências:\n');
    const pedidos = await pool.query(`
      SELECT 
        id,
        numero,
        data_pedido,
        competencia_mes_ano,
        valor_total
      FROM pedidos
      WHERE origem_recurso = 'PNAE' OR origem_recurso IS NULL
      ORDER BY id DESC
      LIMIT 10
    `);
    
    pedidos.rows.forEach(p => {
      console.log(`  Pedido ${p.id} (${p.numero}): Criado em ${p.data_pedido}, Competência: ${p.competencia_mes_ano}, Valor: R$ ${parseFloat(p.valor_total).toFixed(2)}`);
    });
    
    // Agrupar por competência
    console.log('\n2️⃣ Agrupamento por competência (view):\n');
    const porCompetencia = await pool.query(`
      SELECT 
        competencia_mes_ano,
        COUNT(DISTINCT pedido_id) as total_pedidos,
        SUM(valor_itens) as valor_total,
        SUM(valor_agricultura_familiar) as valor_af
      FROM vw_pnae_agricultura_familiar
      GROUP BY competencia_mes_ano
      ORDER BY competencia_mes_ano
    `);
    
    porCompetencia.rows.forEach(row => {
      const pct = row.valor_total > 0 ? (row.valor_af / row.valor_total * 100) : 0;
      console.log(`  ${row.competencia_mes_ano}: ${row.total_pedidos} pedido(s), Total: R$ ${parseFloat(row.valor_total).toFixed(2)}, AF: R$ ${parseFloat(row.valor_af).toFixed(2)} (${pct.toFixed(1)}%)`);
    });
    
    // Comparar com agrupamento por data_pedido (antigo)
    console.log('\n3️⃣ Agrupamento por data_pedido (ANTIGO - INCORRETO):\n');
    const porData = await pool.query(`
      SELECT 
        TO_CHAR(data_pedido, 'YYYY-MM') as mes_data,
        COUNT(DISTINCT pedido_id) as total_pedidos,
        SUM(valor_itens) as valor_total,
        SUM(valor_agricultura_familiar) as valor_af
      FROM vw_pnae_agricultura_familiar
      GROUP BY TO_CHAR(data_pedido, 'YYYY-MM')
      ORDER BY mes_data
    `);
    
    porData.rows.forEach(row => {
      const pct = row.valor_total > 0 ? (row.valor_af / row.valor_total * 100) : 0;
      console.log(`  ${row.mes_data}: ${row.total_pedidos} pedido(s), Total: R$ ${parseFloat(row.valor_total).toFixed(2)}, AF: R$ ${parseFloat(row.valor_af).toFixed(2)} (${pct.toFixed(1)}%)`);
    });
    
    console.log('\n💡 Diferença:');
    console.log('   - Agrupamento por COMPETÊNCIA: Mostra quando o pedido é para ser entregue/consumido');
    console.log('   - Agrupamento por DATA: Mostra quando o pedido foi criado no sistema');
    console.log('   ✅ O correto para PNAE é usar COMPETÊNCIA!\n');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

testCompetencia();
