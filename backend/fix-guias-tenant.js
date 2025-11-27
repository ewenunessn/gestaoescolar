const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'alimentacao_escolar',
  user: 'postgres',
  password: 'admin123'
});

async function fixGuiasTenant() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Atualizando guias com tenant_id\n');

    // Verificar guias sem tenant
    const semTenant = await client.query(`
      SELECT COUNT(*) as total FROM guias WHERE tenant_id IS NULL
    `);
    
    console.log(`Guias sem tenant_id: ${semTenant.rows[0].total}\n`);

    if (parseInt(semTenant.rows[0].total) > 0) {
      // Pegar o primeiro tenant
      const tenant = await client.query('SELECT id, name FROM tenants LIMIT 1');
      
      if (tenant.rows.length > 0) {
        const tenantId = tenant.rows[0].id;
        console.log(`Associando guias ao tenant: ${tenant.rows[0].name}\n`);
        
        const result = await client.query(`
          UPDATE guias SET tenant_id = $1 WHERE tenant_id IS NULL
        `, [tenantId]);
        
        console.log(`✅ ${result.rowCount} guias atualizadas\n`);
      }
    } else {
      console.log('✅ Todas as guias já têm tenant_id\n');
    }

    // Verificar resultado
    const guias = await client.query(`
      SELECT g.id, g.mes, g.ano, t.name as tenant_nome
      FROM guias g
      JOIN tenants t ON g.tenant_id = t.id
      ORDER BY g.created_at DESC
    `);
    
    console.log('Guias cadastradas:');
    guias.rows.forEach(g => {
      console.log(`  ID ${g.id}: ${g.mes}/${g.ano} - Tenant: ${g.tenant_nome}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixGuiasTenant();
