const { Pool } = require('pg');

const connectionString = 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar';

const pool = new Pool({
  connectionString,
  ssl: false
});

async function makeNullable() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Tornando coluna tenant_id nullable na tabela usuarios...\n');
    
    await client.query(`
      ALTER TABLE usuarios 
      ALTER COLUMN tenant_id DROP NOT NULL
    `);
    
    console.log('✅ Coluna tenant_id agora permite NULL!\n');
    
    // Verificar
    const check = await client.query(`
      SELECT 
        column_name, 
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'usuarios' 
      AND column_name = 'tenant_id'
    `);
    
    console.log('📋 Verificação:');
    console.log(`  tenant_id: ${check.rows[0].is_nullable === 'YES' ? 'NULL permitido ✅' : 'NOT NULL ❌'}`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

makeNullable();
