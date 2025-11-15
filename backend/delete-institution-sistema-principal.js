const { Pool } = require('pg');

// URL do Neon (produção)
const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function deleteInstitutionSistemaPrincipal() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️ Deletando instituição "Sistema Principal"...\n');
    
    // Buscar a instituição
    const inst = await client.query(`
      SELECT id, name, slug 
      FROM institutions 
      WHERE slug = 'sistema-principal'
    `);
    
    if (inst.rows.length === 0) {
      console.log('⚠️  Instituição "Sistema Principal" não encontrada');
      return;
    }
    
    const institutionId = inst.rows[0].id;
    console.log(`📋 Instituição encontrada: ${inst.rows[0].name} (${institutionId})\n`);
    
    // Buscar tenants dessa instituição
    const tenants = await client.query(`
      SELECT id, name, slug 
      FROM tenants 
      WHERE institution_id = $1
    `, [institutionId]);
    
    console.log(`📋 ${tenants.rows.length} tenant(s) encontrado(s):\n`);
    tenants.rows.forEach(t => console.log(`   - ${t.name} (${t.slug})`));
    
    // Deletar tenants
    if (tenants.rows.length > 0) {
      const tenantIds = tenants.rows.map(t => t.id);
      
      console.log('\n🗑️ Deletando tenants...');
      await client.query('DELETE FROM tenant_users WHERE tenant_id = ANY($1)', [tenantIds]);
      await client.query('DELETE FROM tenants WHERE id = ANY($1)', [tenantIds]);
      console.log(`✅ ${tenants.rows.length} tenant(s) deletado(s)`);
    }
    
    // Deletar a instituição
    console.log('\n🗑️ Deletando instituição...');
    await client.query('DELETE FROM institutions WHERE id = $1', [institutionId]);
    console.log('✅ Instituição deletada');
    
    // Verificar instituições restantes
    const remaining = await client.query(`
      SELECT id, name, slug, type
      FROM institutions 
      ORDER BY name
    `);
    
    console.log(`\n📊 Instituições restantes (${remaining.rows.length}):\n`);
    remaining.rows.forEach(i => {
      console.log(`   - ${i.name} (${i.slug}) - ${i.type}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

deleteInstitutionSistemaPrincipal()
  .then(() => {
    console.log('\n✅ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falhou:', error);
    process.exit(1);
  });
