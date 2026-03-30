const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/merenda_escolar'
  });

  try {
    const migrationSQL = fs.readFileSync(path.join(__dirname, '20260329_add_guias_performance_indexes.sql'), 'utf8');
    
    console.log('Aplicando índices de performance...');
    await pool.query(migrationSQL);
    console.log('✅ Índices aplicados com sucesso!');
    
    // Verificar índices criados
    const result = await pool.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE indexname LIKE 'idx_gpe_%' OR indexname LIKE 'idx_guias_%'
      ORDER BY tablename, indexname
    `);
    
    console.log('\n📊 Índices criados:');
    result.rows.forEach(row => {
      console.log(`  - ${row.indexname} em ${row.tablename}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error.message);
  } finally {
    await pool.end();
  }
}

applyMigration();