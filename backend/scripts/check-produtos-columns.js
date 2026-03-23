const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'produtos' 
      ORDER BY ordinal_position
    `);
    
    console.log('Colunas da tabela produtos:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });
    
    // Testar query completa
    console.log('\nTestando query do produto 117:');
    const testResult = await pool.query(`
      SELECT 
        p.id,
        p.nome,
        p.descricao,
        p.tipo_processamento,
        p.categoria,
        p.validade_minima,
        p.imagem_url,
        p.perecivel,
        p.ativo,
        p.created_at,
        p.updated_at,
        p.estoque_minimo,
        p.fator_correcao,
        p.tipo_fator_correcao,
        p.unidade_distribuicao,
        p.peso
      FROM produtos p 
      WHERE p.id = 117
    `);
    
    console.log('Resultado:', JSON.stringify(testResult.rows[0], null, 2));
    
  } catch (error) {
    console.error('Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

checkColumns();
