// Script para verificar administradores do sistema no Neon
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkSystemAdmins() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando administradores do sistema no Neon...\n');

    // Verificar se a tabela existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'system_admins'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ Tabela system_admins não existe no banco Neon');
      console.log('💡 Execute: node backend/create-system-admin.js\n');
      return;
    }

    console.log('✅ Tabela system_admins existe\n');

    // Buscar todos os admins
    const result = await client.query(`
      SELECT 
        id,
        name,
        email,
        role,
        status,
        created_at,
        updated_at
      FROM system_admins
      ORDER BY created_at DESC
    `);

    if (result.rows.length === 0) {
      console.log('❌ Nenhum administrador cadastrado no banco Neon');
      console.log('💡 Execute: node backend/create-system-admin.js\n');
      return;
    }

    console.log(`✅ ${result.rows.length} administrador(es) encontrado(s):\n`);
    console.log('═══════════════════════════════════════════════════════');

    result.rows.forEach((admin, index) => {
      console.log(`\n👤 Admin ${index + 1}:`);
      console.log(`   ID: ${admin.id}`);
      console.log(`   Nome: ${admin.name}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Status: ${admin.status}`);
      console.log(`   Criado em: ${new Date(admin.created_at).toLocaleString('pt-BR')}`);
    });

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  🔑 CREDENCIAIS PADRÃO (se não alteradas)');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('   Email: admin@sistema.com');
    console.log('   Senha: Admin@123');
    console.log('');

  } catch (error) {
    console.error('❌ Erro ao verificar admins:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkSystemAdmins()
  .then(() => {
    console.log('✅ Verificação concluída!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Verificação falhou');
    process.exit(1);
  });
