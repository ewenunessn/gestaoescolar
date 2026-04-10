const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function debugFrontendIssue() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    
    // Check the preparation data that the frontend would receive
    const refeicaoResult = await client.query(`
      SELECT 
        id, 
        nome, 
        descricao,
        categoria,
        tempo_preparo_minutos,
        rendimento_porcoes,
        modo_preparo,
        utensilios,
        observacoes_tecnicas,
        ativo
      FROM refeicoes 
      WHERE id = 31;
    `);

    console.log('\n📋 Dados da preparação que o frontend recebe:');
    console.log(JSON.stringify(refeicaoResult.rows[0], null, 2));

    // Check if the query would be enabled
    const prep = refeicaoResult.rows[0];
    const rendimentoPorcoes = prep.rendimento_porcoes;
    const wouldBeEnabled = !!rendimentoPorcoes && rendimentoPorcoes > 0;

    console.log('\n🔍 Análise da condição enabled:');
    console.log(`  rendimentoPorcoes: ${rendimentoPorcoes}`);
    console.log(`  !!rendimentoPorcoes: ${!!rendimentoPorcoes}`);
    console.log(`  rendimentoPorcoes > 0: ${rendimentoPorcoes > 0}`);
    console.log(`  Query seria habilitada? ${wouldBeEnabled ? '✅ SIM' : '❌ NÃO'}`);

    if (wouldBeEnabled) {
      console.log('\n✅ A query DEVERIA estar sendo executada!');
      console.log('   Possíveis causas do problema:');
      console.log('   1. Backend não está rodando');
      console.log('   2. Erro de autenticação na API');
      console.log('   3. Cache do React Query está retornando dados antigos');
      console.log('   4. Erro na resposta da API que não está sendo tratado');
    }

    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await pool.end();
    process.exit(1);
  }
}

debugFrontendIssue();
