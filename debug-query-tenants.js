const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function debugQuery() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    console.log('🔍 Testando query exata do código...\n');
    
    // Query exata do código
    const result = await client.query(`
      SELECT 
        tu.tenant_id,
        tu.role as tenant_role,
        tu.status as tenant_status,
        t.slug as tenant_slug,
        t.nome as tenant_name,
        t.status as tenant_active_status
      FROM tenant_users tu
      JOIN tenants t ON tu.tenant_id = t.id
      WHERE tu.user_id = $1 AND tu.status = 'active' AND t.status = 'active'
      ORDER BY tu.created_at ASC
    `, [2]);
    
    console.log('✅ Sucesso! Resultado:');
    console.log(JSON.stringify(result.rows, null, 2));
    
    console.log('\n🔍 Verificando schema da tabela tenants...\n');
    
    const schema = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'tenants'
      ORDER BY ordinal_position
    `);
    
    console.log('Colunas:');
    schema.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.end();
  }
}

debugQuery();
