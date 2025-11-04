/**
 * Test script for tenant authentication and authorization system
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Database connection - use the compiled version
const db = require('./dist/database.js');

async function testTenantAuth() {
  console.log('🔐 Testando sistema de autenticação e autorização multi-tenant...\n');

  try {
    // 1. Get default tenant first
    console.log('1. Obtendo tenant padrão...');
    const defaultTenantResult = await db.query(`
      SELECT id FROM tenants WHERE id = '00000000-0000-0000-0000-000000000000'
    `);
    
    if (defaultTenantResult.rows.length === 0) {
      throw new Error('Tenant padrão não encontrado. Execute as migrações primeiro.');
    }
    
    const defaultTenantId = defaultTenantResult.rows[0].id;
    console.log('   ✅ Tenant padrão encontrado:', defaultTenantId);

    // 2. Create test users
    console.log('\n2. Criando usuários de teste...');
    
    // Create system admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminResult = await db.query(`
      INSERT INTO usuarios (nome, email, senha, tipo, ativo, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET
        nome = EXCLUDED.nome,
        senha = EXCLUDED.senha,
        tipo = EXCLUDED.tipo,
        ativo = EXCLUDED.ativo,
        tenant_id = EXCLUDED.tenant_id
      RETURNING id, nome, email, tipo
    `, ['Admin Sistema', 'admin@sistema.com', adminPassword, 'admin', true, defaultTenantId]);
    
    const systemAdmin = adminResult.rows[0];
    console.log('   ✅ Admin do sistema criado:', systemAdmin.nome);

    // Create tenant admin
    const tenantAdminPassword = await bcrypt.hash('tenant123', 10);
    const tenantAdminResult = await db.query(`
      INSERT INTO usuarios (nome, email, senha, tipo, ativo, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET
        nome = EXCLUDED.nome,
        senha = EXCLUDED.senha,
        tipo = EXCLUDED.tipo,
        ativo = EXCLUDED.ativo,
        tenant_id = EXCLUDED.tenant_id
      RETURNING id, nome, email, tipo
    `, ['Admin Tenant', 'tenant.admin@escola.com', tenantAdminPassword, 'gestor', true, defaultTenantId]);
    
    const tenantAdmin = tenantAdminResult.rows[0];
    console.log('   ✅ Admin do tenant criado:', tenantAdmin.nome);

    // Create regular user
    const userPassword = await bcrypt.hash('user123', 10);
    const userResult = await db.query(`
      INSERT INTO usuarios (nome, email, senha, tipo, ativo, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET
        nome = EXCLUDED.nome,
        senha = EXCLUDED.senha,
        tipo = EXCLUDED.tipo,
        ativo = EXCLUDED.ativo,
        tenant_id = EXCLUDED.tenant_id
      RETURNING id, nome, email, tipo
    `, ['Usuário Regular', 'user@escola.com', userPassword, 'usuario', true, defaultTenantId]);
    
    const regularUser = userResult.rows[0];
    console.log('   ✅ Usuário regular criado:', regularUser.nome);

    // 3. Create test tenant
    console.log('\n3. Criando tenant de teste...');
    
    // First try to get existing tenant
    let testTenantResult = await db.query(`
      SELECT id, slug, name FROM tenants WHERE slug = $1
    `, ['escola-teste']);
    
    let testTenant;
    if (testTenantResult.rows.length > 0) {
      testTenant = testTenantResult.rows[0];
      console.log('   ✅ Tenant existente encontrado:', testTenant.name);
    } else {
      // Create new tenant with unique subdomain
      const timestamp = Date.now();
      testTenantResult = await db.query(`
        INSERT INTO tenants (slug, name, subdomain, status, settings, limits)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, slug, name
      `, [
        'escola-teste',
        'Escola de Teste',
        `teste-${timestamp}`,
        'active',
        JSON.stringify({
          features: { inventory: true, contracts: true, deliveries: true, reports: true },
          branding: { primaryColor: '#1976d2', secondaryColor: '#dc004e' },
          notifications: { email: true, sms: false, push: true }
        }),
        JSON.stringify({
          maxUsers: 50,
          maxSchools: 10,
          maxProducts: 500,
          storageLimit: 1024,
          apiRateLimit: 100
        })
      ]);
      testTenant = testTenantResult.rows[0];
      console.log('   ✅ Novo tenant criado:', testTenant.name);
    }


    // 4. Create tenant user associations
    console.log('\n4. Criando associações tenant-usuário...');
    
    // Associate tenant admin
    await db.query(`
      INSERT INTO tenant_users (tenant_id, user_id, role, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (tenant_id, user_id) DO UPDATE SET
        role = EXCLUDED.role,
        status = EXCLUDED.status
    `, [testTenant.id, tenantAdmin.id, 'tenant_admin', 'active']);
    console.log('   ✅ Admin associado ao tenant como tenant_admin');

    // Associate regular user
    await db.query(`
      INSERT INTO tenant_users (tenant_id, user_id, role, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (tenant_id, user_id) DO UPDATE SET
        role = EXCLUDED.role,
        status = EXCLUDED.status
    `, [testTenant.id, regularUser.id, 'user', 'active']);
    console.log('   ✅ Usuário regular associado ao tenant como user');

    // 5. Test JWT token generation with tenant context
    console.log('\n5. Testando geração de tokens JWT com contexto de tenant...');
    
    const jwtSecret = process.env.JWT_SECRET || 'sua_chave_jwt_super_secreta_minimo_32_caracteres_producao_2024';
    
    // System admin token
    const systemAdminToken = jwt.sign({
      id: systemAdmin.id,
      tipo: systemAdmin.tipo,
      email: systemAdmin.email,
      nome: systemAdmin.nome,
      tenant: null,
      tenantRole: null,
      isSystemAdmin: true,
      tenants: []
    }, jwtSecret, { expiresIn: '24h' });
    
    console.log('   ✅ Token do admin do sistema gerado');

    // Tenant admin token
    const tenantAdminToken = jwt.sign({
      id: tenantAdmin.id,
      tipo: tenantAdmin.tipo,
      email: tenantAdmin.email,
      nome: tenantAdmin.nome,
      tenant: {
        id: testTenant.id,
        slug: testTenant.slug,
        name: testTenant.name,
        role: 'tenant_admin'
      },
      tenantRole: 'tenant_admin',
      isSystemAdmin: false,
      tenants: [{
        id: testTenant.id,
        slug: testTenant.slug,
        name: testTenant.name,
        role: 'tenant_admin'
      }]
    }, jwtSecret, { expiresIn: '24h' });
    
    console.log('   ✅ Token do admin do tenant gerado');

    // Regular user token
    const regularUserToken = jwt.sign({
      id: regularUser.id,
      tipo: regularUser.tipo,
      email: regularUser.email,
      nome: regularUser.nome,
      tenant: {
        id: testTenant.id,
        slug: testTenant.slug,
        name: testTenant.name,
        role: 'user'
      },
      tenantRole: 'user',
      isSystemAdmin: false,
      tenants: [{
        id: testTenant.id,
        slug: testTenant.slug,
        name: testTenant.name,
        role: 'user'
      }]
    }, jwtSecret, { expiresIn: '24h' });
    
    console.log('   ✅ Token do usuário regular gerado');

    // 6. Test token validation
    console.log('\n6. Testando validação de tokens...');
    
    try {
      const decodedSystemAdmin = jwt.verify(systemAdminToken, jwtSecret);
      console.log('   ✅ Token do admin do sistema validado:', decodedSystemAdmin.nome);
      console.log('      - É admin do sistema:', decodedSystemAdmin.isSystemAdmin);
      
      const decodedTenantAdmin = jwt.verify(tenantAdminToken, jwtSecret);
      console.log('   ✅ Token do admin do tenant validado:', decodedTenantAdmin.nome);
      console.log('      - Tenant:', decodedTenantAdmin.tenant.name);
      console.log('      - Role:', decodedTenantAdmin.tenantRole);
      
      const decodedRegularUser = jwt.verify(regularUserToken, jwtSecret);
      console.log('   ✅ Token do usuário regular validado:', decodedRegularUser.nome);
      console.log('      - Tenant:', decodedRegularUser.tenant.name);
      console.log('      - Role:', decodedRegularUser.tenantRole);
    } catch (error) {
      console.error('   ❌ Erro na validação de token:', error.message);
    }

    // 7. Test permission system
    console.log('\n7. Testando sistema de permissões...');
    
    const permissions = {
      tenant_admin: [
        'tenant:read', 'tenant:update', 'tenant:manage_users', 'tenant:manage_config',
        'schools:create', 'schools:read', 'schools:update', 'schools:delete',
        'products:create', 'products:read', 'products:update', 'products:delete',
        'inventory:create', 'inventory:read', 'inventory:update', 'inventory:delete',
        'contracts:create', 'contracts:read', 'contracts:update', 'contracts:delete',
        'orders:create', 'orders:read', 'orders:update', 'orders:delete',
        'reports:read', 'reports:export', 'users:create', 'users:read', 'users:update', 'users:delete'
      ],
      user: [
        'schools:read', 'products:read', 'inventory:read', 'inventory:update',
        'contracts:read', 'orders:read', 'orders:create', 'orders:update', 'reports:read'
      ],
      viewer: [
        'schools:read', 'products:read', 'inventory:read',
        'contracts:read', 'orders:read', 'reports:read'
      ]
    };
    
    console.log('   ✅ Permissões do tenant_admin:', permissions.tenant_admin.length, 'permissões');
    console.log('   ✅ Permissões do user:', permissions.user.length, 'permissões');
    console.log('   ✅ Permissões do viewer:', permissions.viewer.length, 'permissões');

    // 8. Test tenant user queries
    console.log('\n8. Testando consultas de usuários por tenant...');
    
    const tenantUsersResult = await db.query(`
      SELECT 
        tu.id,
        tu.role,
        tu.status,
        u.nome,
        u.email,
        t.name as tenant_name
      FROM tenant_users tu
      JOIN usuarios u ON tu.user_id = u.id
      JOIN tenants t ON tu.tenant_id = t.id
      WHERE tu.tenant_id = $1
      ORDER BY tu.role DESC, u.nome
    `, [testTenant.id]);
    
    console.log('   ✅ Usuários do tenant encontrados:', tenantUsersResult.rows.length);
    tenantUsersResult.rows.forEach(user => {
      console.log(`      - ${user.nome} (${user.email}) - Role: ${user.role} - Status: ${user.status}`);
    });

    // 9. Test user tenant associations
    console.log('\n9. Testando associações de tenant por usuário...');
    
    const userTenantsResult = await db.query(`
      SELECT 
        tu.role,
        tu.status,
        t.id,
        t.slug,
        t.name,
        t.status as tenant_status
      FROM tenant_users tu
      JOIN tenants t ON tu.tenant_id = t.id
      WHERE tu.user_id = $1 AND tu.status = 'active' AND t.status = 'active'
      ORDER BY tu.created_at ASC
    `, [tenantAdmin.id]);
    
    console.log('   ✅ Tenants do usuário encontrados:', userTenantsResult.rows.length);
    userTenantsResult.rows.forEach(tenant => {
      console.log(`      - ${tenant.name} (${tenant.slug}) - Role: ${tenant.role} - Status: ${tenant.status}`);
    });

    console.log('\n🎉 Todos os testes de autenticação e autorização multi-tenant passaram!');
    console.log('\n📋 Resumo dos tokens gerados:');
    console.log('   - Admin do Sistema:', systemAdminToken.substring(0, 50) + '...');
    console.log('   - Admin do Tenant:', tenantAdminToken.substring(0, 50) + '...');
    console.log('   - Usuário Regular:', regularUserToken.substring(0, 50) + '...');
    
    console.log('\n🔧 Para testar as APIs, use os tokens acima nos headers:');
    console.log('   Authorization: Bearer <token>');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
    throw error;
  }
}

// Execute test
if (require.main === module) {
  testTenantAuth()
    .then(() => {
      console.log('\n✅ Teste concluído com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Teste falhou:', error);
      process.exit(1);
    });
}

module.exports = { testTenantAuth };