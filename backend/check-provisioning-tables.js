const { Pool } = require('pg');

// Configuração do banco local
const localPool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'alimentacao_escolar',
  password: 'admin123',
  port: 5432,
});

// Configuração do banco Neon
const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

async function checkTable(pool, tableName, dbName) {
  try {
    console.log(`\n📊 Verificando tabela ${tableName} no ${dbName}:`);
    
    // Verificar se a tabela existe
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `, [tableName]);
    
    if (!tableExists.rows[0].exists) {
      console.log(`❌ Tabela ${tableName} NÃO EXISTE no ${dbName}`);
      return;
    }
    
    console.log(`✅ Tabela ${tableName} existe no ${dbName}`);
    
    // Verificar estrutura da tabela
    const columns = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = $1
      ORDER BY ordinal_position;
    `, [tableName]);
    
    console.log(`   Colunas (${columns.rows.length}):`);
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Contar registros
    const count = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
    console.log(`   Total de registros: ${count.rows[0].count}`);
    
    // Mostrar alguns registros de exemplo
    if (parseInt(count.rows[0].count) > 0) {
      const sample = await pool.query(`SELECT * FROM ${tableName} LIMIT 3`);
      console.log(`   Exemplo de registros:`, JSON.stringify(sample.rows, null, 2));
    }
    
  } catch (error) {
    console.error(`❌ Erro ao verificar ${tableName} no ${dbName}:`, error.message);
  }
}

async function checkProvisioningTables() {
  console.log('🔍 Verificando tabelas de provisioning...\n');
  
  const tables = [
    'institutions',
    'tenants',
    'institution_users',
    'tenant_users',
    'institution_audit_log'
  ];
  
  for (const table of tables) {
    await checkTable(localPool, table, 'LOCAL');
    await checkTable(neonPool, table, 'NEON');
    console.log('\n' + '='.repeat(80));
  }
  
  // Verificar se há usuários com institution_id no Neon
  console.log('\n🔍 Verificando usuários com institution_id no NEON:');
  try {
    const usersWithInstitution = await neonPool.query(`
      SELECT id, nome, email, institution_id, tenant_id, tipo
      FROM usuarios
      WHERE institution_id IS NOT NULL
      LIMIT 5
    `);
    console.log(`Total de usuários com institution_id: ${usersWithInstitution.rows.length}`);
    console.log('Exemplos:', JSON.stringify(usersWithInstitution.rows, null, 2));
  } catch (error) {
    console.error('❌ Erro ao verificar usuários:', error.message);
  }
  
  await localPool.end();
  await neonPool.end();
}

checkProvisioningTables().catch(console.error);
