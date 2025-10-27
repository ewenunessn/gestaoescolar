const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function debugCadastroData() {
  try {
    console.log('🔍 Investigando como o backend processa datas no cadastro...\n');

    // 1. Simular o que o app mobile envia
    const dataEnviadaPeloApp = '2025-12-14'; // Formato que o app envia
    console.log('📱 Data enviada pelo app:', dataEnviadaPeloApp);

    // 2. Testar como o PostgreSQL interpreta essa data
    console.log('\n🗄️  Como o PostgreSQL interpreta:');
    
    const testesPostgres = [
      `SELECT '${dataEnviadaPeloApp}'::date as data_interpretada`,
      `SELECT '${dataEnviadaPeloApp}'::date::text as data_como_texto`,
      `SELECT '${dataEnviadaPeloApp}'::timestamp as data_timestamp`,
      `SELECT '${dataEnviadaPeloApp}'::timestamp AT TIME ZONE 'UTC' as data_utc`,
      `SELECT '${dataEnviadaPeloApp}'::timestamp AT TIME ZONE 'America/Sao_Paulo' as data_br`
    ];

    for (const query of testesPostgres) {
      try {
        const result = await pool.query(query);
        console.log(`${query.split(' as ')[1]}:`, result.rows[0]);
      } catch (error) {
        console.log(`Erro em ${query}:`, error.message);
      }
    }

    // 3. Simular inserção de lote como o backend faz
    console.log('\n📦 Simulando inserção de lote:');
    
    // Primeiro, vamos ver como seria inserido
    const produto_id = 79; // ID da Abóbora
    const lote = `TESTE_${Date.now()}`;
    const quantidade = 50;
    const data_validade = dataEnviadaPeloApp;

    console.log('Dados para inserção:');
    console.log('  produto_id:', produto_id);
    console.log('  lote:', lote);
    console.log('  quantidade:', quantidade);
    console.log('  data_validade:', data_validade);

    // Simular a query de inserção (sem executar)
    const queryInsercao = `
      INSERT INTO estoque_lotes (
        produto_id, lote, quantidade_inicial, quantidade_atual,
        data_validade, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $3, $4, 'ativo', NOW(), NOW())
      RETURNING *
    `;

    console.log('\n🔧 Query de inserção que seria executada:');
    console.log(queryInsercao);
    console.log('Parâmetros:', [produto_id, lote, quantidade, data_validade]);

    // Testar como seria interpretado
    const testInsert = await pool.query(`
      SELECT 
        $1::integer as produto_id,
        $2::text as lote,
        $3::numeric as quantidade,
        $4::date as data_validade,
        $4::date::text as data_validade_texto,
        NOW() as created_at
    `, [produto_id, lote, quantidade, data_validade]);

    console.log('\n✅ Como seria salvo no banco:');
    console.log(testInsert.rows[0]);

    // 4. Testar como seria retornado pela API
    console.log('\n🔄 Como seria retornado pela API:');
    
    const apiQuery = `
      SELECT 
        data_validade,
        data_validade::text as data_validade_raw
      FROM (
        SELECT '${data_validade}'::date as data_validade
      ) as teste
    `;

    const apiResult = await pool.query(apiQuery);
    console.log('Resultado da API:', apiResult.rows[0]);

    // 5. Simular como o JavaScript processaria
    console.log('\n🔧 Como o JavaScript processaria:');
    
    const dataRetornadaAPI = apiResult.rows[0].data_validade_raw;
    console.log('Data retornada pela API:', dataRetornadaAPI);
    
    // Método antigo (problemático)
    const dataAntiga = new Date(dataRetornadaAPI);
    console.log('Método antigo - new Date():', dataAntiga);
    console.log('Método antigo - toLocaleDateString():', dataAntiga.toLocaleDateString('pt-BR'));
    
    // Método corrigido
    const [ano, mes, dia] = dataRetornadaAPI.split('-').map(Number);
    const dataCorrigida = new Date(ano, mes - 1, dia);
    console.log('Método corrigido - new Date(ano, mes-1, dia):', dataCorrigida);
    console.log('Método corrigido - toLocaleDateString():', dataCorrigida.toLocaleDateString('pt-BR'));

    // 6. Verificar timezone do sistema
    console.log('\n🌍 Informações do sistema:');
    console.log('Timezone do Node.js:', Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log('Offset atual (minutos):', new Date().getTimezoneOffset());
    
    const timezoneDB = await pool.query('SHOW timezone');
    console.log('Timezone do PostgreSQL:', timezoneDB.rows[0].TimeZone);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

debugCadastroData();