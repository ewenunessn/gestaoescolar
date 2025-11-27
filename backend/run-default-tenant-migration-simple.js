const db = require('./src/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = await db.pool.connect();
  
  try {
    console.log('🚀 Executando migration: 018_add_default_tenant_to_institutions.sql');
    
    const migrationPath = path.join(__dirname, 'migrations', '018_add_default_tenant_to_institutions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(migrationSQL);
    
    console.log('✅ Migration executada com sucesso!');
    
    // Verificar se a coluna foi criada
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'institutions' 
      AND column_name = 'default_tenant_id'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Coluna default_tenant_id criada:', result.rows[0]);
    } else {
      console.log('⚠️ Coluna default_tenant_id não encontrada');
    }
    
    // Listar instituições
    const institutions = await client.query('SELECT id, name, default_tenant_id FROM institutions');
    console.log('\n📋 Instituições:');
    institutions.rows.forEach(inst => {
      console.log(`  - ${inst.name}: default_tenant_id = ${inst.default_tenant_id || 'null'}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao executar migration:', error);
    throw error;
  } finally {
    client.release();
    process.exit(0);
  }
}

runMigration().catch(console.error);
