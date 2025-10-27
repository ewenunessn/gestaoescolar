const { Client } = require('pg');

async function checkDates() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('✅ Conectado ao banco');
    
    // Verificar lotes da Abóbora (produto_id = 79)
    console.log('\n📦 Lotes da Abóbora no banco:');
    const lotes = await client.query(`
      SELECT 
        id, lote, quantidade_atual, 
        data_validade, 
        data_validade::text as data_validade_raw,
        status, created_at
      FROM estoque_lotes 
      WHERE produto_id = 79 
      ORDER BY created_at DESC
    `);
    
    console.table(lotes.rows);
    
    // Verificar estoque principal da Abóbora
    console.log('\n🏫 Estoque principal da Abóbora:');
    const estoque = await client.query(`
      SELECT 
        ee.id, ee.quantidade_atual, 
        ee.data_validade,
        ee.data_validade::text as data_validade_raw,
        ee.data_entrada,
        ee.updated_at
      FROM estoque_escolas ee
      WHERE ee.escola_id = 84 AND ee.produto_id = 79
    `);
    
    console.table(estoque.rows);
    
    // Testar a query da API
    console.log('\n🔍 Resultado da query da API:');
    const apiResult = await client.query(`
      SELECT 
        ee.id,
        84::integer as escola_id,
        p.id as produto_id,
        -- Somar quantidade dos lotes se existirem, senão usar a do estoque principal
        COALESCE(
          (SELECT SUM(el.quantidade_atual) 
           FROM estoque_lotes el 
           WHERE el.produto_id = p.id AND el.status = 'ativo'),
          ee.quantidade_atual,
          0
        ) as quantidade_atual,
        -- Usar a validade mais próxima dos lotes se existirem, senão usar a do estoque principal
        COALESCE(
          (SELECT MIN(el.data_validade) 
           FROM estoque_lotes el 
           WHERE el.produto_id = p.id AND el.status = 'ativo' AND el.quantidade_atual > 0),
          ee.data_validade
        ) as data_validade,
        COALESCE(
          (SELECT MIN(el.data_validade) 
           FROM estoque_lotes el 
           WHERE el.produto_id = p.id AND el.status = 'ativo' AND el.quantidade_atual > 0),
          ee.data_validade
        )::text as data_validade_raw,
        p.nome as produto_nome
      FROM produtos p
      CROSS JOIN escolas e
      LEFT JOIN estoque_escolas ee ON (ee.produto_id = p.id AND ee.escola_id = e.id)
      WHERE p.ativo = true 
        AND e.id = 84 
        AND e.ativo = true
        AND p.id = 79
    `);
    
    console.table(apiResult.rows);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

checkDates();