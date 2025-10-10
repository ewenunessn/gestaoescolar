require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');

async function testLogicaDias() {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'alimentacao_escolar',
    password: process.env.DB_PASSWORD || 'admin123',
    port: process.env.DB_PORT || 5432,
    ssl: false
  });

  try {
    console.log('=== TESTE DA NOVA LÓGICA DE CÁLCULO DE DIAS ===\n');
    
    // Criar demanda de teste sem resposta
    console.log('1. Criando demanda sem resposta (enviada há 3 dias)...');
    const demandaSemResposta = await pool.query(`
      INSERT INTO demandas (
        escola_nome, numero_oficio, data_solicitacao, data_semead,
        objeto, descricao_itens, status, usuario_criacao_id
      ) VALUES (
        'Escola Teste', 'TEST001', '2025-10-07', '2025-10-07',
        'Teste sem resposta', 'Teste', 'enviado_semead', 1
      ) RETURNING id
    `);
    
    // Criar demanda de teste com resposta
    console.log('2. Criando demanda com resposta (enviada há 5 dias, respondida há 2 dias)...');
    const demandaComResposta = await pool.query(`
      INSERT INTO demandas (
        escola_nome, numero_oficio, data_solicitacao, data_semead, data_resposta_semead,
        objeto, descricao_itens, status, usuario_criacao_id
      ) VALUES (
        'Escola Teste 2', 'TEST002', '2025-10-05', '2025-10-05', '2025-10-08',
        'Teste com resposta', 'Teste', 'atendido', 1
      ) RETURNING id
    `);
    
    // Testar o cálculo
    console.log('\n3. Testando cálculo de dias...\n');
    const resultado = await pool.query(`
      SELECT 
        id, numero_oficio, data_semead, data_resposta_semead,
        CASE 
          WHEN data_semead IS NULL THEN NULL
          WHEN data_resposta_semead IS NOT NULL THEN 
            CASE 
              WHEN data_resposta_semead::date = data_semead::date THEN 0
              ELSE (data_resposta_semead::date - data_semead::date)::integer
            END
          WHEN data_semead::date = CURRENT_DATE THEN 0
          ELSE (CURRENT_DATE - data_semead::date)::integer
        END as dias_calculados
      FROM demandas 
      WHERE numero_oficio IN ('TEST001', 'TEST002')
      ORDER BY id
    `);
    
    resultado.rows.forEach(row => {
      console.log(`Ofício: ${row.numero_oficio}`);
      console.log(`Data envio: ${row.data_semead}`);
      console.log(`Data resposta: ${row.data_resposta_semead || 'Sem resposta'}`);
      console.log(`Dias calculados: ${row.dias_calculados}`);
      
      if (row.numero_oficio === 'TEST001') {
        console.log(`✓ Esperado: 3 dias (aguardando resposta)`);
      } else {
        console.log(`✓ Esperado: 3 dias (tempo de resposta: 05/10 → 08/10)`);
      }
      console.log('---');
    });
    
    // Limpar dados de teste
    console.log('\n4. Limpando dados de teste...');
    await pool.query(`DELETE FROM demandas WHERE numero_oficio IN ('TEST001', 'TEST002')`);
    console.log('✓ Dados de teste removidos');
    
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

testLogicaDias();