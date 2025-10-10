require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');

async function testDiasCalculo() {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'alimentacao_escolar',
    password: process.env.DB_PASSWORD || 'admin123',
    port: process.env.DB_PORT || 5432,
    ssl: false
  });

  try {
    // Testar o cálculo de dias baseado na data de envio à SEMEAD
    const result = await pool.query(`
      SELECT 
        id,
        data_solicitacao,
        data_semead,
        CASE 
          WHEN data_semead IS NULL THEN NULL
          WHEN data_resposta_semead IS NOT NULL THEN 
            CASE 
              WHEN data_resposta_semead::date = data_semead::date THEN 0
              ELSE (data_resposta_semead::date - data_semead::date)::integer
            END
          WHEN data_semead::date = CURRENT_DATE THEN 0
          ELSE (CURRENT_DATE - data_semead::date)::integer
        END as dias_calculados,
        dias_solicitacao as dias_armazenados
      FROM demandas 
      ORDER BY id DESC 
      LIMIT 5
    `);
    
    console.log('Teste de cálculo de dias (aguardando resposta da SEMEAD):');
    console.log('Data atual:', new Date().toISOString().split('T')[0]);
    console.log('');
    
    result.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`Data solicitação: ${row.data_solicitacao}`);
      console.log(`Data envio SEMEAD: ${row.data_semead || 'Não enviado'}`);
      console.log(`Data resposta SEMEAD: ${row.data_resposta_semead || 'Sem resposta'}`);
      console.log(`Dias calculados: ${row.dias_calculados !== null ? row.dias_calculados : 'N/A (não enviado)'}`);
      console.log(`Dias armazenados: ${row.dias_armazenados}`);
      console.log('---');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

testDiasCalculo();