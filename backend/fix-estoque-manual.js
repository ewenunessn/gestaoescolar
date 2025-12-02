require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alimentacao_escolar',
  password: process.env.DB_PASSWORD || 'admin123',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: false
});

async function fixEstoque() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Corrigindo estoque manualmente...\n');
    
    // Recalcular estoque principal baseado na soma dos lotes
    const result = await client.query(`
      UPDATE estoque_escolas ee
      SET quantidade_atual = (
        SELECT COALESCE(SUM(el.quantidade_atual), 0)
        FROM estoque_lotes el
        WHERE el.escola_id = ee.escola_id
          AND el.produto_id = ee.produto_id
          AND el.status = 'ativo'
          AND el.tenant_id = ee.tenant_id
      )
      WHERE ee.escola_id = 181 
        AND ee.tenant_id = 'f830d523-25c9-4162-b241-6599df73171b'
    `);
    
    console.log(`✅ ${result.rowCount} registros atualizados\n`);
    
    // Verificar resultado
    const verificacao = await client.query(`
      SELECT 
        ee.id,
        ee.produto_id,
        p.nome as produto,
        ee.quantidade_atual as estoque_principal,
        (SELECT COALESCE(SUM(el.quantidade_atual), 0)
         FROM estoque_lotes el
         WHERE el.escola_id = ee.escola_id
           AND el.produto_id = ee.produto_id
           AND el.status = 'ativo'
           AND el.tenant_id = ee.tenant_id) as total_lotes
      FROM estoque_escolas ee
      JOIN produtos p ON p.id = ee.produto_id
      WHERE ee.escola_id = 181
        AND ee.tenant_id = 'f830d523-25c9-4162-b241-6599df73171b'
    `);
    
    console.log('📊 Verificação:');
    verificacao.rows.forEach(r => {
      console.log(`  ${r.produto}: Estoque=${r.estoque_principal}, Lotes=${r.total_lotes}`);
      if (parseFloat(r.estoque_principal) === parseFloat(r.total_lotes)) {
        console.log('  ✅ Consistente');
      } else {
        console.log('  ❌ Inconsistente');
      }
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixEstoque();
