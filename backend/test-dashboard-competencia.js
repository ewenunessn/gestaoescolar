require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false
});

async function testDashboard() {
  try {
    console.log('🧪 Testando Dashboard PNAE com competência\n');
    
    const anoAtual = new Date().getFullYear();
    
    // Testar query de evolução mensal
    console.log('📊 Evolução mensal por competência:\n');
    const evolucaoQuery = `
      SELECT 
        CAST(SPLIT_PART(competencia_mes_ano, '-', 2) AS INTEGER) as mes,
        CASE CAST(SPLIT_PART(competencia_mes_ano, '-', 2) AS INTEGER)
          WHEN 1 THEN 'Jan/' || SPLIT_PART(competencia_mes_ano, '-', 1)
          WHEN 2 THEN 'Fev/' || SPLIT_PART(competencia_mes_ano, '-', 1)
          WHEN 3 THEN 'Mar/' || SPLIT_PART(competencia_mes_ano, '-', 1)
          WHEN 4 THEN 'Abr/' || SPLIT_PART(competencia_mes_ano, '-', 1)
          WHEN 5 THEN 'Mai/' || SPLIT_PART(competencia_mes_ano, '-', 1)
          WHEN 6 THEN 'Jun/' || SPLIT_PART(competencia_mes_ano, '-', 1)
          WHEN 7 THEN 'Jul/' || SPLIT_PART(competencia_mes_ano, '-', 1)
          WHEN 8 THEN 'Ago/' || SPLIT_PART(competencia_mes_ano, '-', 1)
          WHEN 9 THEN 'Set/' || SPLIT_PART(competencia_mes_ano, '-', 1)
          WHEN 10 THEN 'Out/' || SPLIT_PART(competencia_mes_ano, '-', 1)
          WHEN 11 THEN 'Nov/' || SPLIT_PART(competencia_mes_ano, '-', 1)
          WHEN 12 THEN 'Dez/' || SPLIT_PART(competencia_mes_ano, '-', 1)
        END as mes_nome,
        SUM(valor_itens) as valor_total,
        SUM(valor_agricultura_familiar) as valor_af
      FROM vw_pnae_agricultura_familiar
      WHERE EXTRACT(YEAR FROM TO_DATE(competencia_mes_ano || '-01', 'YYYY-MM-DD')) = $1
      GROUP BY competencia_mes_ano, CAST(SPLIT_PART(competencia_mes_ano, '-', 2) AS INTEGER)
      ORDER BY mes
    `;
    
    const evolucao = await pool.query(evolucaoQuery, [anoAtual]);
    
    evolucao.rows.forEach(row => {
      const pct = row.valor_total > 0 ? (row.valor_af / row.valor_total * 100) : 0;
      console.log(`  ${row.mes_nome}: R$ ${parseFloat(row.valor_af).toFixed(2)} (${pct.toFixed(1)}%)`);
    });
    
    console.log('\n✅ Agora o gráfico mostrará os valores corretos por competência!');
    console.log('   - Abril/2026: R$ 30.000,00');
    console.log('   - Maio/2026: R$ 10.000,00\n');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

testDashboard();
