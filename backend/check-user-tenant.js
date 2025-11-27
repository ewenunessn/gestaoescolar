const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'alimentacao_escolar',
  user: 'postgres',
  password: 'admin123'
});

async function checkUserTenant() {
  const client = await pool.connect();
  
  try {
    console.log('👤 Verificando usuários e seus tenants\n');

    // Listar usuários e seus tenants
    const users = await client.query(`
      SELECT 
        u.id,
        u.nome,
        u.email,
        tu.tenant_id,
        t.name as tenant_nome,
        t.slug as tenant_slug
      FROM usuarios u
      LEFT JOIN tenant_users tu ON u.id = tu.user_id
      LEFT JOIN tenants t ON tu.tenant_id = t.id
      ORDER BY u.nome
    `);

    console.log('Usuários cadastrados:');
    users.rows.forEach(u => {
      console.log(`  ${u.nome} (${u.email})`);
      console.log(`    Tenant: ${u.tenant_nome || 'SEM TENANT'} (${u.tenant_slug || 'N/A'})`);
      console.log('');
    });

    // Verificar a guia
    console.log('📋 Guia cadastrada:');
    const guia = await client.query(`
      SELECT g.*, t.name as tenant_nome, t.slug as tenant_slug
      FROM guias g
      JOIN tenants t ON g.tenant_id = t.id
    `);

    guia.rows.forEach(g => {
      console.log(`  ID ${g.id}: ${g.mes}/${g.ano}`);
      console.log(`    Tenant: ${g.tenant_nome} (${g.tenant_slug})`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkUserTenant();
