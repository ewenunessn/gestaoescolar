const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'alimentacao_escolar',
  user: 'postgres',
  password: 'admin123'
});

async function testGuiasAPI() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testando query de guias\n');

    // Pegar um tenant
    const tenant = await client.query('SELECT id, slug, name FROM tenants LIMIT 1');
    
    if (tenant.rows.length === 0) {
      console.log('❌ Nenhum tenant encontrado');
      return;
    }

    const tenantId = tenant.rows[0].id;
    console.log(`Tenant: ${tenant.rows[0].name} (${tenantId})\n`);

    // Testar a query que o model usa
    console.log('Executando query do model...');
    const result = await client.query(`
      SELECT 
        g.*,
        COUNT(DISTINCT gpe.id) as total_produtos
      FROM guias g
      LEFT JOIN guia_produto_escola gpe ON g.id = gpe.guia_id
      WHERE g.tenant_id = $1
      GROUP BY g.id
      ORDER BY g.created_at DESC
    `, [tenantId]);

    console.log(`Resultado: ${result.rows.length} guias encontradas\n`);

    if (result.rows.length > 0) {
      result.rows.forEach(g => {
        console.log(`  ID ${g.id}: ${g.mes}/${g.ano} - ${g.status} - ${g.total_produtos} produtos`);
      });
    } else {
      console.log('  Nenhuma guia encontrada para este tenant');
    }

    // Verificar todas as guias no banco
    console.log('\n📊 Todas as guias no banco:');
    const allGuias = await client.query(`
      SELECT g.id, g.mes, g.ano, g.tenant_id, t.name as tenant_nome
      FROM guias g
      LEFT JOIN tenants t ON g.tenant_id = t.id
      ORDER BY g.created_at DESC
    `);

    allGuias.rows.forEach(g => {
      console.log(`  ID ${g.id}: ${g.mes}/${g.ano} - Tenant: ${g.tenant_nome || 'NULL'}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

testGuiasAPI();
