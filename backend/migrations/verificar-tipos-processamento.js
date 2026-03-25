const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function verificarTipos() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando valores de tipo_processamento no banco...\n');

    // Buscar todos os valores distintos
    const result = await client.query(`
      SELECT 
        tipo_processamento,
        COUNT(*) as total
      FROM produtos
      GROUP BY tipo_processamento
      ORDER BY total DESC
    `);

    console.log('📊 Valores encontrados:\n');
    result.rows.forEach(row => {
      console.log(`Valor: "${row.tipo_processamento || '(NULL)'}"`);
      console.log(`Total: ${row.total} produtos`);
      console.log('---');
    });

    // Verificar valores que não são válidos
    const invalidos = await client.query(`
      SELECT id, nome, tipo_processamento
      FROM produtos
      WHERE tipo_processamento IS NOT NULL
        AND tipo_processamento NOT IN ('in natura', 'minimamente processado', 'processado', 'ultraprocessado')
      ORDER BY tipo_processamento, nome
    `);

    if (invalidos.rows.length > 0) {
      console.log(`\n⚠️  ${invalidos.rows.length} produtos com valores inválidos:\n`);
      invalidos.rows.forEach(row => {
        console.log(`ID ${row.id}: ${row.nome} → "${row.tipo_processamento}"`);
      });
    } else {
      console.log('\n✅ Todos os valores são válidos!');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar
verificarTipos().catch(console.error);
