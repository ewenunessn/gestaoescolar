const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar'
});

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Aplicando migration de per capita por modalidade...\n');
    
    const migrationPath = path.join(__dirname, 'migrations', '20260313_add_percapita_modalidade.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    
    console.log('✅ Migration aplicada com sucesso!\n');
    
    // Verificar se a tabela foi criada
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'refeicao_produto_modalidade'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Tabela refeicao_produto_modalidade criada');
    }
    
    // Verificar view
    const viewResult = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name = 'vw_refeicao_produtos_com_modalidade'
    `);
    
    if (viewResult.rows.length > 0) {
      console.log('✅ View vw_refeicao_produtos_com_modalidade criada');
    }
    
    console.log('\n✨ Tudo pronto!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao aplicar migration:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration().catch(console.error);
