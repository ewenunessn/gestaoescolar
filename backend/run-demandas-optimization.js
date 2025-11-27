const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'alimentacao_escolar',
  user: 'postgres',
  password: 'admin123'
});

async function runMigration() {
  try {
    await client.connect();
    console.log('✅ Conectado ao banco\n');
    
    const migrationPath = path.join(__dirname, 'migrations', '023_optimize_demandas_performance.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔄 Executando migration de otimização...\n');
    const start = Date.now();
    
    await client.query(sql);
    
    const duration = Date.now() - start;
    console.log(`✅ Migration executada com sucesso em ${duration}ms\n`);
    
    // Verificar índices criados
    console.log('📊 Verificando índices criados:\n');
    const result = await client.query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'demandas'
      ORDER BY indexname
    `);
    
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.indexname}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
