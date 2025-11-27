const { Pool } = require('pg');

const connectionString = 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar';

const pool = new Pool({
  connectionString,
  ssl: false
});

async function checkTable() {
  const client = await pool.connect();
  
  try {
    console.log('📋 Estrutura da tabela usuarios:\n');
    
    const columns = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'usuarios'
      ORDER BY ordinal_position
    `);
    
    columns.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`  ${col.column_name.padEnd(20)} ${col.data_type.padEnd(25)} ${nullable}${defaultVal}`);
    });
    
    // Verificar constraints
    console.log('\n📋 Constraints:\n');
    const constraints = await client.query(`
      SELECT 
        conname as constraint_name,
        contype as constraint_type
      FROM pg_constraint
      WHERE conrelid = 'usuarios'::regclass
    `);
    
    constraints.rows.forEach(c => {
      const type = {
        'p': 'PRIMARY KEY',
        'f': 'FOREIGN KEY',
        'u': 'UNIQUE',
        'c': 'CHECK'
      }[c.constraint_type] || c.constraint_type;
      console.log(`  ${c.constraint_name.padEnd(40)} ${type}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTable();
