const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function verificarView() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    console.log('📋 Verificando se existe VIEW tenants...\n');
    
    const views = await client.query(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_name = 'tenants'
    `);
    
    console.log('Resultados:');
    views.rows.forEach(row => {
      console.log(`  - ${row.table_name} (${row.table_type})`);
    });
    
    console.log('\n📋 Testando query do login...\n');
    
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
      LIMIT 1
    `, [2]);
    
    console.log('✅ Query executada com sucesso!');
    console.log('Resultado:', result.rows);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

verificarView();
