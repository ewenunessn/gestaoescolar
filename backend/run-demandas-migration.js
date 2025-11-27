const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Executando migration: 017_add_tenant_to_demandas.sql\n');

    // Ler o arquivo de migration
    const migrationPath = path.join(__dirname, 'migrations', '017_add_tenant_to_demandas.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Executar a migration
    await client.query('BEGIN');
    
    console.log('📝 Executando SQL...');
    await client.query(migrationSQL);
    
    await client.query('COMMIT');
    
    console.log('✅ Migration executada com sucesso!\n');

    // Verificar resultado
    console.log('🔍 Verificando resultado...\n');
    
    const structureResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'demandas' AND column_name = 'tenant_id'
    `);
    
    if (structureResult.rows.length > 0) {
      console.log('✅ Coluna tenant_id criada com sucesso');
      console.log(`   Tipo: ${structureResult.rows[0].data_type}`);
      console.log(`   Nullable: ${structureResult.rows[0].is_nullable}\n`);
    }

    const indexResult = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'demandas' AND indexname = 'idx_demandas_tenant_id'
    `);
    
    if (indexResult.rows.length > 0) {
      console.log('✅ Índice idx_demandas_tenant_id criado com sucesso\n');
    }

    const rlsResult = await client.query(`
      SELECT policyname
      FROM pg_policies
      WHERE tablename = 'demandas' AND policyname = 'demandas_tenant_isolation'
    `);
    
    if (rlsResult.rows.length > 0) {
      console.log('✅ Policy RLS demandas_tenant_isolation criada com sucesso\n');
    }

    // Verificar dados
    const countResult = await client.query('SELECT COUNT(*) as total FROM demandas');
    const total = parseInt(countResult.rows[0].total);
    
    if (total > 0) {
      const withTenantResult = await client.query(`
        SELECT COUNT(*) as total FROM demandas WHERE tenant_id IS NOT NULL
      `);
      const withTenant = parseInt(withTenantResult.rows[0].total);
      
      console.log(`📊 Dados migrados:`);
      console.log(`   Total de demandas: ${total}`);
      console.log(`   Com tenant_id: ${withTenant}`);
      console.log(`   Sem tenant_id: ${total - withTenant}\n`);
    } else {
      console.log('📊 Nenhuma demanda existente no banco\n');
    }

    console.log('✅ Migration concluída com sucesso!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Execute: node backend/test-demandas-tenant.js');
    console.log('   2. Teste a API de demandas');
    console.log('   3. Verifique o frontend\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao executar migration:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
