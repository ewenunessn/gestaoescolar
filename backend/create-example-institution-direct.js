// Script para criar instituição diretamente no banco de dados
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createExampleInstitution() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Criando instituição de exemplo diretamente no banco...\n');
    
    await client.query('BEGIN');

    // 1. Criar instituição
    console.log('1️⃣ Criando instituição...');
    const institutionResult = await client.query(`
      INSERT INTO institutions (
        slug, name, legal_name, document_number, type, status,
        email, phone,
        address_street, address_number, address_complement,
        address_neighborhood, address_city, address_state, address_zipcode
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      'prefeitura-exemplo',
      'Prefeitura Municipal de Exemplo',
      'Prefeitura Municipal de Exemplo - CNPJ',
      '12345678000190',
      'prefeitura',
      'active',
      'contato@exemplo.gov.br',
      '(11) 3333-4444',
      'Avenida Principal',
      '1000',
      'Centro Administrativo',
      'Centro',
      'Exemplo',
      'SP',
      '12345-678'
    ]);
    
    const institution = institutionResult.rows[0];
    console.log('✅ Instituição criada:', institution.name);

    // 2. Criar tenant
    console.log('\n2️⃣ Criando tenant...');
    const tenantResult = await client.query(`
      INSERT INTO tenants (
        institution_id, slug, name, subdomain, status
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      institution.id,
      'educacao-exemplo',
      'Secretaria Municipal de Educação',
      'educacao-exemplo',
      'active'
    ]);
    
    const tenant = tenantResult.rows[0];
    console.log('✅ Tenant criado:', tenant.name);

    // 3. Criar usuário admin
    console.log('\n3️⃣ Criando usuário administrador...');
    const hashedPassword = await bcrypt.hash('Senha@123', 10);
    
    const userResult = await client.query(`
      INSERT INTO usuarios (
        nome, email, senha, tipo, ativo, institution_id, tenant_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, nome, email, tipo, ativo, institution_id, tenant_id, created_at
    `, [
      'João Silva',
      'joao.silva@exemplo.gov.br',
      hashedPassword,
      'admin',
      true,
      institution.id,
      tenant.id
    ]);
    
    const user = userResult.rows[0];
    console.log('✅ Usuário criado:', user.nome);

    // 4. Vincular usuário à instituição
    console.log('\n4️⃣ Vinculando usuário à instituição...');
    await client.query(`
      INSERT INTO institution_users (
        institution_id, user_id, role, status
      ) VALUES ($1, $2, $3, $4)
    `, [
      institution.id,
      user.id,
      'institution_admin',
      'active'
    ]);
    console.log('✅ Vínculo instituição-usuário criado');

    // 5. Vincular usuário ao tenant
    console.log('\n5️⃣ Vinculando usuário ao tenant...');
    await client.query(`
      INSERT INTO tenant_users (
        tenant_id, user_id, role, status
      ) VALUES ($1, $2, $3, $4)
    `, [
      tenant.id,
      user.id,
      'tenant_admin',
      'active'
    ]);
    console.log('✅ Vínculo tenant-usuário criado');

    // 6. Criar log de auditoria
    await client.query(`
      INSERT INTO institution_audit_log (
        institution_id, operation, entity_type, entity_id, new_values, user_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      institution.id,
      'CREATE',
      'institution_provisioning',
      institution.id,
      JSON.stringify({
        institution: institution.name,
        tenant: tenant.name,
        admin: user.email
      }),
      user.id
    ]);

    await client.query('COMMIT');

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  ✅ INSTITUIÇÃO CRIADA COM SUCESSO');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('🏛️  INSTITUIÇÃO:');
    console.log(`   ID: ${institution.id}`);
    console.log(`   Nome: ${institution.name}`);
    console.log(`   Slug: ${institution.slug}`);
    console.log(`   Status: ${institution.status}`);
    console.log('');

    console.log('🏢 TENANT:');
    console.log(`   ID: ${tenant.id}`);
    console.log(`   Nome: ${tenant.name}`);
    console.log(`   Slug: ${tenant.slug}`);
    console.log(`   Subdomínio: ${tenant.subdomain}`);
    console.log('');

    console.log('👤 ADMINISTRADOR:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Nome: ${user.nome}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Tipo: ${user.tipo}`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════');
    console.log('  🔑 CREDENCIAIS DE ACESSO');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`   Email: joao.silva@exemplo.gov.br`);
    console.log(`   Senha: Senha@123`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════');
    console.log('  📝 PRÓXIMOS PASSOS');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('1. Acesse o sistema principal: http://localhost:5173');
    console.log('2. Faça login com as credenciais acima');
    console.log('3. O usuário terá acesso ao tenant "Secretaria Municipal de Educação"');
    console.log('4. Acesse o painel admin: http://localhost:5174');
    console.log('5. Veja os detalhes da instituição criada');
    console.log('');

    return {
      institution,
      tenant,
      user
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Erro ao criar instituição:', error);
    
    if (error.code === '23505') {
      console.error('\n⚠️  Erro: Já existe uma instituição com esse slug, email ou CNPJ');
      console.error('   Tente usar valores diferentes ou delete a instituição existente');
    }
    
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar
createExampleInstitution()
  .then(() => {
    console.log('✅ Script concluído com sucesso!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falhou');
    process.exit(1);
  });
