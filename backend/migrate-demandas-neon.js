const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const neonUrl = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: neonUrl,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Executando migration no NEON\n');

    const migrationPath = path.join(__dirname, 'migrations', '017_add_tenant_to_demandas.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    await client.query('BEGIN');
    console.log('📝 Executando SQL...');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('✅ Migration executada!\n');

    // Verificar
    const check = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'demandas' AND column_name = 'tenant_id'
    `);
    
    if (check.rows.length > 0) {
      console.log('✅ Coluna tenant_id criada no NEON\n');
    }

    const count = await client.query('SELECT COUNT(*) as total FROM demandas');
    console.log(`📊 Total de demandas no NEON: ${count.rows[0].total}\n`);

    console.log('✅ Migration NEON concluída!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
