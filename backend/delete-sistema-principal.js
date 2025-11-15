const { Pool } = require('pg');

// URL do Neon (produção)
const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function deleteSistemaPrincipal() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️ Deletando Sistema Principal...\n');
    
    const tenantId = '00000000-0000-0000-0000-000000000000';
    
    // Buscar todas as tabelas com tenant_id
    const tablesResult = await client.query(`
      SELECT DISTINCT table_name 
      FROM information_schema.columns 
      WHERE column_name = 'tenant_id' 
      AND table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`📋 Encontradas ${tablesResult.rows.length} tabelas com tenant_id\n`);
    
    // Deletar de todas as tabelas (exceto usuarios e tenants)
    for (const row of tablesResult.rows) {
      const table = row.table_name;
      
      // Pular tabelas problemáticas
      if (table === 'usuarios' || table === 'tenants') {
        continue;
      }
      
      try {
        const result = await client.query(`DELETE FROM ${table} WHERE tenant_id = $1`, [tenantId]);
        if (result.rowCount > 0) {
          console.log(`✅ ${table}: ${result.rowCount} registros deletados`);
        }
      } catch (err) {
        console.log(`⚠️  ${table}: ${err.message}`);
      }
    }
    
    // Deletar tenant_users
    const users = await client.query('DELETE FROM tenant_users WHERE tenant_id = $1', [tenantId]);
    if (users.rowCount > 0) {
      console.log(`✅ tenant_users: ${users.rowCount} registros deletados`);
    }
    
    // Deletar o tenant (forçar com CASCADE se necessário)
    try {
      const tenant = await client.query('DELETE FROM tenants WHERE id = $1 RETURNING name', [tenantId]);
      console.log(`\n✅ Tenant "${tenant.rows[0]?.name}" deletado`);
    } catch (err) {
      console.log(`\n⚠️  Não foi possível deletar o tenant: ${err.message}`);
      console.log('💡 O tenant "Sistema Principal" tem muitas dependências.');
      console.log('   Recomendo deixá-lo no banco mas inativo.');
    }
    
    // Verificar tenants restantes
    const remaining = await client.query(`
      SELECT id, name, slug 
      FROM tenants 
      ORDER BY name
    `);
    
    console.log(`\n📊 Tenants restantes (${remaining.rows.length}):\n`);
    
    for (const t of remaining.rows) {
      console.log(`   - ${t.name} (${t.slug})`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

deleteSistemaPrincipal()
  .then(() => {
    console.log('\n✅ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falhou:', error);
    process.exit(1);
  });
