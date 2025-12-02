require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alimentacao_escolar',
  password: process.env.DB_PASSWORD || 'admin123',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: false
});

async function createUser() {
  const client = await pool.connect();
  
  try {
    const tenantId = 'f830d523-25c9-4162-b241-6599df73171b'; // Brenda Nunes
    
    console.log('👤 Criando usuário para o tenant Brenda Nunes...\n');
    
    // Verificar se já existe um usuário com este email
    const existingUser = await client.query(`
      SELECT id, nome, email, tenant_id
      FROM usuarios
      WHERE email = 'brenda@escola.com'
    `);
    
    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      console.log('⚠️  Usuário já existe:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Nome: ${user.nome}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Tenant: ${user.tenant_id}`);
      
      if (user.tenant_id !== tenantId) {
        console.log('\n🔄 Atualizando tenant do usuário...');
        await client.query(`
          UPDATE usuarios
          SET tenant_id = $1
          WHERE id = $2
        `, [tenantId, user.id]);
        console.log('✅ Tenant atualizado!');
      }
      
      console.log(`\n✅ Use este usuário para fazer login:`);
      console.log(`   Email: brenda@escola.com`);
      console.log(`   Senha: brenda123`);
      return;
    }
    
    // Criar senha hash
    const senha = 'brenda123';
    const senhaHash = await bcrypt.hash(senha, 10);
    
    // Criar usuário
    const result = await client.query(`
      INSERT INTO usuarios (
        nome,
        email,
        senha,
        tipo,
        tenant_id,
        ativo,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
      RETURNING id, nome, email, tipo, tenant_id
    `, [
      'Brenda Nunes',
      'brenda@escola.com',
      senhaHash,
      'admin',
      tenantId
    ]);
    
    const user = result.rows[0];
    
    console.log('✅ Usuário criado com sucesso!');
    console.log(`   ID: ${user.id}`);
    console.log(`   Nome: ${user.nome}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Tipo: ${user.tipo}`);
    console.log(`   Tenant: ${user.tenant_id}`);
    console.log('');
    console.log('🔑 Credenciais de acesso:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Senha: ${senha}`);
    console.log('');
    console.log('💡 Faça login com estas credenciais para acessar a escola 181.');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

createUser();
