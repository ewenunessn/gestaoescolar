const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'alimentacao_escolar',
  user: 'postgres',
  password: 'admin123'
});

async function createGuiaEscolaTeste() {
  const client = await pool.connect();
  
  try {
    console.log('📝 Criando guia para Escola de Teste\n');

    // Pegar o tenant Escola de Teste
    const tenant = await client.query(`
      SELECT id, name FROM tenants WHERE slug = 'escola-teste'
    `);

    if (tenant.rows.length === 0) {
      console.log('❌ Tenant Escola de Teste não encontrado');
      return;
    }

    const tenantId = tenant.rows[0].id;
    console.log(`Tenant: ${tenant.rows[0].name} (${tenantId})\n`);

    // Criar uma guia
    const result = await client.query(`
      INSERT INTO guias (tenant_id, mes, ano, observacao, status, created_at, updated_at)
      VALUES ($1, 10, 2025, 'Guia de novembro', 'aberta', NOW(), NOW())
      RETURNING *
    `, [tenantId]);

    console.log('✅ Guia criada com sucesso!');
    console.log(`  ID: ${result.rows[0].id}`);
    console.log(`  Mês/Ano: ${result.rows[0].mes}/${result.rows[0].ano}`);
    console.log(`  Status: ${result.rows[0].status}\n`);

    // Verificar guias por tenant
    console.log('📊 Guias por tenant:');
    const guias = await client.query(`
      SELECT t.name as tenant_nome, COUNT(g.id) as total
      FROM tenants t
      LEFT JOIN guias g ON t.id = g.tenant_id
      GROUP BY t.id, t.name
      ORDER BY t.name
    `);

    guias.rows.forEach(row => {
      console.log(`  ${row.tenant_nome}: ${row.total} guias`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.message.includes('duplicate')) {
      console.log('\n⚠️  Já existe uma guia para este mês/ano neste tenant');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

createGuiaEscolaTeste();
