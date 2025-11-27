const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'alimentacao_escolar',
  user: 'postgres',
  password: 'admin123'
});

async function testQuery() {
  try {
    await client.connect();
    console.log('✅ Conectado ao banco\n');
    
    // Testar a query que está causando timeout
    console.log('🔄 Executando query de demandas...');
    const start = Date.now();
    
    const result = await client.query(`
      SELECT 
        d.*,
        COALESCE(d.escola_nome, e.nome) as escola_nome,
        u.nome as usuario_criacao_nome
      FROM demandas d
      LEFT JOIN escolas e ON d.escola_id = e.id
      LEFT JOIN usuarios u ON d.usuario_criacao_id = u.id
      WHERE d.tenant_id = $1
      ORDER BY d.data_solicitacao DESC, d.created_at DESC
      LIMIT 10
    `, ['f830d523-25c9-4162-b241-6599df73171b']);
    
    const duration = Date.now() - start;
    
    console.log(`✅ Query executada em ${duration}ms`);
    console.log(`📊 Resultados: ${result.rows.length} demandas encontradas\n`);
    
    if (result.rows.length > 0) {
      console.log('📋 Primeira demanda:');
      console.log(result.rows[0]);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

testQuery();
