const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const client = new Client({ connectionString });

async function criarTabelaTenantUsers() {
  try {
    console.log('🔌 Conectando ao banco...');
    await client.connect();
    console.log('✅ Conectado!\n');
    
    // Criar tabela tenant_users
    console.log('📋 Criando tabela tenant_users...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenant_users (
        id SERIAL PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, user_id)
      )
    `);
    console.log('✅ Tabela tenant_users criada!');

    // Criar índices
    console.log('📊 Criando índices...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON tenant_users(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON tenant_users(user_id);
      CREATE INDEX IF NOT EXISTS idx_tenant_users_status ON tenant_users(status);
    `);
    console.log('✅ Índices criados!');

    // Associar usuários existentes ao tenant padrão
    console.log('👥 Associando usuários ao tenant padrão...');
    const result = await client.query(`
      INSERT INTO tenant_users (tenant_id, user_id, role, status)
      SELECT 
        '00000000-0000-0000-0000-000000000000'::uuid,
        id,
        CASE 
          WHEN tipo = 'admin' THEN 'admin'
          WHEN tipo = 'gestor' THEN 'manager'
          ELSE 'user'
        END,
        'active'
      FROM usuarios
      WHERE NOT EXISTS (
        SELECT 1 FROM tenant_users WHERE user_id = usuarios.id
      )
      RETURNING *
    `);
    
    console.log(`✅ ${result.rowCount} usuário(s) associado(s)!`);
    
    // Verificar associações
    const check = await client.query(`
      SELECT 
        u.id, u.nome, u.email, u.tipo,
        tu.role, tu.status,
        t.nome as tenant_nome
      FROM usuarios u
      JOIN tenant_users tu ON u.id = tu.user_id
      JOIN tenants t ON tu.tenant_id = t.id
      ORDER BY u.id
    `);
    
    console.log('\n📋 Usuários associados:');
    check.rows.forEach(row => {
      console.log(`  - ${row.nome} (${row.email}) -> ${row.tenant_nome} [${row.role}]`);
    });

    console.log('\n🎉 Tudo pronto!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

criarTabelaTenantUsers();
