require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false
});

async function exemploComParcelas() {
  try {
    console.log('📝 Exemplo: Configurando parcelas nas modalidades\n');
    
    // Exemplo: CRECHE recebe 12 parcelas mensais
    await pool.query(`
      UPDATE modalidades 
      SET parcelas = 12 
      WHERE nome = 'CRECHE'
    `);
    
    console.log('✅ Atualizado: CRECHE agora tem 12 parcelas (mensal)\n');
    
    // Mostrar o impacto no cálculo
    console.log('📊 Impacto no cálculo PNAE:\n');
    
    const modalidades = await pool.query(`
      SELECT 
        nome,
        valor_repasse,
        parcelas,
        (valor_repasse * parcelas) as total_anual
      FROM modalidades
      WHERE ativo = true
      ORDER BY nome
    `);
    
    let totalFNDE = 0;
    modalidades.rows.forEach(m => {
      totalFNDE += parseFloat(m.total_anual);
      console.log(`   ${m.nome.padEnd(20)} R$ ${parseFloat(m.valor_repasse).toFixed(2).padStart(12)} x ${String(m.parcelas).padStart(2)} = R$ ${parseFloat(m.total_anual).toFixed(2).padStart(12)}`);
    });
    
    console.log(`\n   ${'TOTAL FNDE'.padEnd(20)} ${' '.repeat(18)} R$ ${totalFNDE.toFixed(2).padStart(12)}\n`);
    
    const valorMinimoAF = totalFNDE * 0.45;
    console.log(`💡 Com esse valor, o município deve gastar no mínimo:`);
    console.log(`   R$ ${valorMinimoAF.toFixed(2)} (45%) com Agricultura Familiar`);
    console.log(`   Lei nº 15.226/2025 - vigente desde 2026\n`);
    
    console.log('📌 Dica: No frontend, você pode editar cada modalidade e definir:');
    console.log('   - 1 parcela: Repasse único anual');
    console.log('   - 12 parcelas: Repasse mensal');
    console.log('   - 4 parcelas: Repasse trimestral');
    console.log('   - etc.\n');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

exemploComParcelas();
