const { Pool } = require('pg');

// URL do Neon (produção)
const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function deleteEmptyTenants() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️ Deletando tenants vazios (exceto Teste Fix)...\n');
    
    // Buscar todos os tenants exceto Secretaria de Educação e Teste Fix
    const tenants = await client.query(`
      SELECT id, name, slug 
      FROM tenants 
      WHERE slug NOT IN ('secretaria-educacao', 'testefix')
      ORDER BY name
    `);
    
    console.log(`📋 Encontrados ${tenants.rows.length} tenants para deletar:\n`);
    
    for (const tenant of tenants.rows) {
      console.log(`🗑️ Deletando: ${tenant.name} (${tenant.slug})`);
      
      try {
        // Deletar tenant_users primeiro
        await client.query('DELETE FROM tenant_users WHERE tenant_id = $1', [tenant.id]);
        
        // Deletar o tenant
        await client.query('DELETE FROM tenants WHERE id = $1', [tenant.id]);
        
        console.log(`   ✅ Deletado com sucesso\n`);
      } catch (err) {
        console.log(`   ❌ Erro: ${err.message}\n`);
      }
    }
    
    // Verificar tenants restantes
    const remaining = await client.query(`
      SELECT id, name, slug 
      FROM tenants 
      ORDER BY name
    `);
    
    console.log('✅ Deleção concluída!\n');
    console.log(`📊 Tenants restantes (${remaining.rows.length}):\n`);
    
    for (const tenant of remaining.rows) {
      console.log(`   - ${tenant.name} (${tenant.slug})`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

deleteEmptyTenants()
  .then(() => {
    console.log('\n✅ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falhou:', error);
    process.exit(1);
  });
