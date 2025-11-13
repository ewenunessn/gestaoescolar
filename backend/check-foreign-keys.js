const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkForeignKeys() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando foreign keys relacionadas a tenant_id...\n');
    
    const result = await client.query(`
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND (kcu.column_name = 'tenant_id' OR ccu.column_name = 'tenant_id')
      ORDER BY tc.table_name;
    `);
    
    console.log(`Encontradas ${result.rows.length} foreign keys:\n`);
    
    result.rows.forEach(row => {
      console.log(`📋 Tabela: ${row.table_name}`);
      console.log(`   Coluna: ${row.column_name}`);
      console.log(`   Referencia: ${row.foreign_table_name}.${row.foreign_column_name}`);
      console.log(`   ON DELETE: ${row.delete_rule}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkForeignKeys();
