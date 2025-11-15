const { Pool } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function deleteData() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️ Deletando dados fake...\n');
    
    // Deletar contrato_produtos
    const cp = await client.query('DELETE FROM contrato_produtos');
    console.log(`✅ ${cp.rowCount} contrato_produtos deletados`);
    
    // Deletar contrato fake se existir
    const c = await client.query(`DELETE FROM contratos WHERE numero = 'CONTRATO-2025-001'`);
    console.log(`✅ ${c.rowCount} contratos deletados`);
    
    // Deletar fornecedor fake se existir
    const f = await client.query(`DELETE FROM fornecedores WHERE nome = 'Fornecedor Padrão'`);
    console.log(`✅ ${f.rowCount} fornecedores deletados`);
    
    console.log('\n✅ Dados fake deletados!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

deleteData();
