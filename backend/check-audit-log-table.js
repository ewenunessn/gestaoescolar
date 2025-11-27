const { Pool } = require('pg');

const connectionString = 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar';

const pool = new Pool({
  connectionString,
  ssl: false
});

async function checkTable() {
  const client = await pool.connect();
  
  try {
    // Verificar se a tabela existe
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'institution_audit_log'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('❌ Tabela institution_audit_log NÃO existe!');
      console.log('\n📋 Tabelas disponíveis:');
      
      const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      
      tables.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    } else {
      console.log('✅ Tabela institution_audit_log existe!');
      
      // Ver estrutura
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'institution_audit_log'
        ORDER BY ordinal_position
      `);
      
      console.log('\n📋 Colunas:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTable();
