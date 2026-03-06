const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar'
});

async function checkTables() {
  try {
    console.log('🔍 Verificando tabelas de cardápios...\n');
    
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE 'cardapio%'
      ORDER BY table_name
    `);
    
    console.log(`✅ Tabelas encontradas: ${result.rows.length}`);
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    if (result.rows.length === 0) {
      console.log('\n❌ Nenhuma tabela de cardápios encontrada!');
      console.log('Executando migration...\n');
      
      const fs = require('fs');
      const path = require('path');
      const sqlPath = path.join(__dirname, '../src/migrations/20260305_refactor_cardapios.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');
      
      await pool.query(sql);
      console.log('✅ Migration executada!');
      
      // Verificar novamente
      const result2 = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name LIKE 'cardapio%'
        ORDER BY table_name
      `);
      
      console.log(`\n✅ Tabelas após migration: ${result2.rows.length}`);
      result2.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
