const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function updateAdminPassword() {
  try {
    console.log('🔐 Atualizando senha do administrador...\n');

    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    console.log('Hash gerado:', hashedPassword);

    const result = await pool.query(`
      UPDATE system_admins 
      SET password = $1, updated_at = CURRENT_TIMESTAMP
      WHERE email = $2
      RETURNING id, name, email, role
    `, [hashedPassword, 'admin@sistema.com']);

    if (result.rows.length === 0) {
      console.log('❌ Administrador não encontrado. Criando...');
      
      const insertResult = await pool.query(`
        INSERT INTO system_admins (name, email, password, role, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        'Administrador do Sistema',
        'admin@sistema.com',
        hashedPassword,
        'super_admin',
        'active'
      ]);

      console.log('✅ Administrador criado:', insertResult.rows[0]);
    } else {
      console.log('✅ Senha atualizada para:', result.rows[0]);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  🔑 CREDENCIAIS ATUALIZADAS');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('   Email: admin@sistema.com');
    console.log('   Senha: Admin@123');
    console.log('');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

updateAdminPassword();
