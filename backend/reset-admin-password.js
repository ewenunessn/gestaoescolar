// Resetar senha do admin no Neon
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const NEON_URL = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: NEON_URL,
  ssl: { rejectUnauthorized: false }
});

async function resetPassword() {
  try {
    const email = 'admin@sistema.com';
    const newPassword = 'Admin@123';
    
    console.log('🔄 Resetando senha do admin...\n');
    
    // Gerar novo hash
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Atualizar no banco
    const result = await pool.query(
      'UPDATE system_admins SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING *',
      [hashedPassword, email]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Admin não encontrado!\n');
      return;
    }
    
    const admin = result.rows[0];
    
    console.log('✅ Senha resetada com sucesso!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  🔑 NOVAS CREDENCIAIS');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Senha: ${newPassword}`);
    console.log(`   Nome: ${admin.name}`);
    console.log(`   Status: ${admin.status}\n`);
    
    // Testar se funciona
    console.log('🧪 Testando nova senha...');
    const isValid = await bcrypt.compare(newPassword, hashedPassword);
    
    if (isValid) {
      console.log('✅ Senha testada e confirmada!\n');
    } else {
      console.log('❌ Erro ao testar senha!\n');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

resetPassword();
