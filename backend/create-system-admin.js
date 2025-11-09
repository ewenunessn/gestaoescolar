// Script para criar administrador do sistema
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createSystemAdmin() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Criando tabela de administradores do sistema...\n');

    // Executar migration
    const migrationPath = path.join(__dirname, 'migrations', '015_create_system_admins.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(migrationSQL);
    console.log('✅ Tabela system_admins criada\n');

    // Criar admin padrão
    console.log('👤 Criando administrador padrão...');
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    
    const result = await client.query(`
      INSERT INTO system_admins (name, email, password, role, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) 
      DO UPDATE SET 
        password = EXCLUDED.password,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      'Administrador do Sistema',
      'admin@sistema.com',
      hashedPassword,
      'super_admin',
      'active'
    ]);

    const admin = result.rows[0];

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  ✅ ADMINISTRADOR DO SISTEMA CRIADO');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('👤 Dados do Administrador:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Nome: ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Status: ${admin.status}`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════');
    console.log('  🔑 CREDENCIAIS DE ACESSO AO PAINEL ADMIN');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('   URL: http://localhost:5174');
    console.log('   Email: admin@sistema.com');
    console.log('   Senha: Admin@123');
    console.log('');

    console.log('═══════════════════════════════════════════════════════');
    console.log('  📝 PERMISSÕES');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('   ✅ Criar, ler, atualizar e deletar instituições');
    console.log('   ✅ Criar, ler, atualizar e deletar tenants');
    console.log('   ✅ Criar, ler, atualizar e deletar usuários');
    console.log('   ✅ Acesso total ao sistema');
    console.log('');

    return admin;

  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createSystemAdmin()
  .then(() => {
    console.log('✅ Script concluído com sucesso!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script falhou');
    process.exit(1);
  });
