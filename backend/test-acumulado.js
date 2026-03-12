require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false
});

async function testAcumulado() {
  try {
    console.log('🧪 Testando cálculo acumulado\n');
    
    const anoAtual = new Date().getFullYear();
    
    // Valor recebido FNDE
    const valorFNDEResult = await pool.query(`
      SELECT COALESCE(SUM(valor_repasse * COALESCE(parcelas, 1)), 0) as valor_total_fnde
      FROM modalidades
      WHERE ativo = true
    `);
    const valorFNDE = parseFloat(valorFNDEResult.rows[0].valor_total_fnde);
    
    console.log(`💰 Valor recebido FNDE: R$ ${valorFNDE.toFixed(2)}\n`);
    
    // Evolução acumulada
    const evolucaoQuery = `
      WITH meses_ordenados AS (
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
      )
      SELECT 
        mes,
        mes_nome,
        SUM(valor_total) OVER (ORDER BY mes) as valor_total_acumulado,
        SUM(valor_af) OVER (ORDER BY mes) as valor_af_acumulado,
        valor_total as valor_total_mes,
        valor_af as valor_af_mes
      FROM meses_ordenados
      ORDER BY mes
    `;
    
    const result = await pool.query(evolucaoQuery, [anoAtual]);
    
    console.log('📊 Evolução Acumulada:\n');
    console.log('Mês       | Valor Mês    | Acumulado    | % Acumulado | Status');
    console.log('----------|--------------|--------------|-------------|--------');
    
    result.rows.forEach(row => {
      const valorMes = parseFloat(row.valor_af_mes || 0);
      const valorAcum = parseFloat(row.valor_af_acumulado || 0);
      const pctAcum = valorFNDE > 0 ? (valorAcum / valorFNDE * 100) : 0;
      const status = pctAcum >= 45 ? '✅' : '❌';
      
      console.log(
        `${row.mes_nome.padEnd(9)} | ` +
        `R$ ${valorMes.toFixed(2).padStart(9)} | ` +
        `R$ ${valorAcum.toFixed(2).padStart(9)} | ` +
        `${pctAcum.toFixed(2).padStart(10)}% | ${status}`
      );
    });
    
    console.log('\n💡 Interpretação:');
    console.log('   - Valor Mês: Quanto foi gasto com AF naquele mês');
    console.log('   - Acumulado: Soma de todos os meses até aquele ponto');
    console.log('   - % Acumulado: (Acumulado / Valor FNDE) × 100');
    console.log('   - Meta: 45% até o final do ano\n');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

testAcumulado();
