const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Usar connection string do Neon diretamente
const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function createAdmin() {
  try {
    console.log('\n🔧 Criando admin do sistema...\n');

    // Hash da senha
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Inserir admin
    const result = await pool.query(`
      INSERT INTO system_admins (name, email, password, role, permissions, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions
      RETURNING *
    `, [
      'System Administrator',
      'admin',
      hashedPassword,
      'super_admin',
      JSON.stringify({
        institutions: { create: true, read: true, update: true, delete: true },
        tenants: { create: true, read: true, update: true, delete: true },
        users: { create: true, read: true, update: true, delete: true },
        system: { manage: true }
      })
    ]);

    console.log('✅ Admin criado com sucesso!');
    console.log('Email:', result.rows[0].email);
    console.log('Role:', result.rows[0].role);
    console.log('\n📝 Credenciais:');
    console.log('Email: admin');
    console.log('Senha: admin123');

    await pool.end();
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

createAdmin();
