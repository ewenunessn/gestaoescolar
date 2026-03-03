const { Pool } = require('pg');
const fs = require('fs');

const localPool = new Pool({
  connectionString: 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar'
});

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function aplicar() {
  const sql = fs.readFileSync('src/migrations/20260303_refactor_estoque_central_lotes.sql', 'utf8');
  
  try {
    console.log('Aplicando refatoração no banco LOCAL...');
    await localPool.query(sql);
    console.log('✓ LOCAL OK');
  } catch (error) {
    console.error('Erro LOCAL:', error.message);
  }
  
  try {
    console.log('\nAplicando refatoração no banco NEON...');
    await neonPool.query(sql);
    console.log('✓ NEON OK');
  } catch (error) {
    console.error('Erro NEON:', error.message);
  }
  
  await localPool.end();
  await neonPool.end();
}

aplicar();
