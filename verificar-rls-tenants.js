const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function verificarRLS() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    console.log('📋 Verificando RLS e políticas na tabela tenants...\n');
    
    // Verificar se RLS está habilitado
    const rls = await client.query(`
      SELECT relname, relrowsecurity, relforcerowsecurity
      FROM pg_class
      WHERE relname = 'tenants'
    `);
    
    console.log('RLS Status:');
    console.log(rls.rows);
    
    // Verificar políticas
    const policies = await client.query(`
      SELECT *
      FROM pg_policies
      WHERE tablename = 'tenants'
    `);
    
    console.log('\nPolíticas RLS:');
    console.log(policies.rows);
    
    // Verificar views
    const views = await client.query(`
      SELECT table_name, view_definition
      FROM information_schema.views
      WHERE table_name LIKE '%tenant%'
    `);
    
    console.log('\nViews relacionadas a tenant:');
    console.log(views.rows);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

verificarRLS();
