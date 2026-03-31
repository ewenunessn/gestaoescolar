const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function checkConstraints() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando constraints da tabela cardapio_refeicoes_dia...\n');
    
    // Listar todas as constraints
    const result = await client.query(`
      SELECT 
        con.conname AS constraint_name,
        con.contype AS constraint_type,
        pg_get_constraintdef(con.oid) AS constraint_definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE rel.relname = 'cardapio_refeicoes_dia'
      ORDER BY con.conname;
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Tabela não encontrada ou sem constraints');
    } else {
      console.log('📋 Constraints encontradas:\n');
      result.rows.forEach(row => {
        const type = {
          'p': 'PRIMARY KEY',
          'f': 'FOREIGN KEY',
          'u': 'UNIQUE',
          'c': 'CHECK'
        }[row.constraint_type] || row.constraint_type;
        
        console.log(`${row.constraint_name}`);
        console.log(`  Tipo: ${type}`);
        console.log(`  Definição: ${row.constraint_definition}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkConstraints();
