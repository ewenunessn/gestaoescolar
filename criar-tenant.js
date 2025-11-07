// Script para criar tenant e associar usuário
const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function criarTenant() {
  const client = new Client({ connectionString });
  
  try {
    console.log('🔌 Conectando ao banco...');
    await client.connect();
    console.log('✅ Conectado!\n');

    // 1. Criar tenant (apenas colunas essenciais)
    console.log('1️⃣ Criando tenant padrão...');
    await client.query(`
      INSERT INTO tenants (
        id,
        nome,
        slug
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        'Sistema Principal',
        'sistema-principal'
      )
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('✅ Tenant criado!\n');

    // 2. Atualizar tenant_id do usuário
    console.log('2️⃣ Atualizando tenant_id do usuário...');
    await client.query(`
      UPDATE usuarios 
      SET tenant_id = '00000000-0000-0000-0000-000000000000'
      WHERE email = 'ewenunes0@gmail.com'
    `);
    console.log('✅ Tenant_id atualizado!\n');

    // 3. Verificar
    console.log('3️⃣ Verificando...');
    const tenantResult = await client.query(`
      SELECT id, slug, nome FROM tenants 
      WHERE id = '00000000-0000-0000-0000-000000000000'
    `);
    console.log('📊 Tenant:', tenantResult.rows[0]);

    const userResult = await client.query(`
      SELECT id, nome, email, tenant_id
      FROM usuarios
      WHERE email = 'ewenunes0@gmail.com'
    `);
    console.log('👤 Usuário:', userResult.rows[0]);

    console.log('\n🎉 SUCESSO! Tenant criado e usuário associado!');
    console.log('\n📋 Credenciais para login:');
    console.log('   Email: ewenunes0@gmail.com');
    console.log('   Senha: @Nunes8922');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  } finally {
    await client.end();
    console.log('\n🔌 Conexão fechada.');
  }
}

criarTenant();
