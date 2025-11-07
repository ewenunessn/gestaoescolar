const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function criarTenantSemed() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('🔌 Conectado ao banco!\n');
    
    // Criar tenant SEMED
    console.log('🏢 Criando tenant SEMED...');
    const tenantResult = await client.query(`
      INSERT INTO tenants (id, nome, slug, status, email, telefone)
      VALUES (
        gen_random_uuid(),
        'SEMED - Secretaria Municipal de Educação',
        'semed',
        'active',
        'contato@semed.gov.br',
        '(11) 3333-4444'
      )
      RETURNING *
    `);
    
    const tenant = tenantResult.rows[0];
    console.log('✅ Tenant criado:', tenant.nome);
    console.log('   ID:', tenant.id);
    console.log('   Slug:', tenant.slug);
    
    // Associar Ewerton ao tenant SEMED como admin
    console.log('\n👤 Associando Ewerton Nunes ao tenant SEMED...');
    await client.query(`
      INSERT INTO tenant_users (tenant_id, user_id, role, status)
      VALUES ($1, 2, 'admin', 'active')
    `, [tenant.id]);
    console.log('✅ Associação criada!');
    
    // Criar mais um tenant (Escola Municipal)
    console.log('\n🏫 Criando tenant Escola Municipal...');
    const escolaResult = await client.query(`
      INSERT INTO tenants (id, nome, slug, status, email, telefone)
      VALUES (
        gen_random_uuid(),
        'Escola Municipal João Silva',
        'escola-joao-silva',
        'active',
        'contato@escolajoaosilva.edu.br',
        '(11) 4444-5555'
      )
      RETURNING *
    `);
    
    const escola = escolaResult.rows[0];
    console.log('✅ Tenant criado:', escola.nome);
    console.log('   ID:', escola.id);
    console.log('   Slug:', escola.slug);
    
    // Associar Ewerton à escola como manager
    console.log('\n👤 Associando Ewerton Nunes à escola...');
    await client.query(`
      INSERT INTO tenant_users (tenant_id, user_id, role, status)
      VALUES ($1, 2, 'manager', 'active')
    `, [escola.id]);
    console.log('✅ Associação criada!');
    
    // Verificar todas as associações do Ewerton
    console.log('\n📋 Tenants do Ewerton Nunes:');
    const check = await client.query(`
      SELECT 
        t.nome as tenant_nome,
        t.slug,
        tu.role,
        tu.status
      FROM tenant_users tu
      JOIN tenants t ON tu.tenant_id = t.id
      WHERE tu.user_id = 2
      ORDER BY tu.created_at
    `);
    
    check.rows.forEach(row => {
      console.log(`  - ${row.tenant_nome} (${row.slug}) [${row.role}]`);
    });
    
    console.log('\n🎉 Pronto! Agora o Ewerton tem 3 tenants!');
    
  } finally {
    await client.end();
  }
}

criarTenantSemed();
