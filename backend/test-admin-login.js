// Testar login do admin no Neon
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const NEON_URL = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: NEON_URL,
  ssl: { rejectUnauthorized: false }
});

async function testLogin() {
  try {
    const email = 'admin@sistema.com';
    const password = 'Admin@123';
    
    console.log('🔐 Testando login...');
    console.log(`Email: ${email}`);
    console.log(`Senha: ${password}\n`);
    
    // Buscar admin
    const result = await pool.query(
      'SELECT * FROM system_admins WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Admin não encontrado com esse email!\n');
      return;
    }
    
    const admin = result.rows[0];
    console.log('✅ Admin encontrado:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Nome: ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Status: ${admin.status}\n`);
    
    // Testar senha
    console.log('🔑 Testando senha...');
    const isValid = await bcrypt.compare(password, admin.password);
    
    if (isValid) {
      console.log('✅ SENHA CORRETA! Login funcionaria.\n');
    } else {
      console.log('❌ SENHA INCORRETA! O hash não corresponde.\n');
      console.log('Hash no banco:', admin.password.substring(0, 30) + '...\n');
      
      // Gerar novo hash para comparação
      const newHash = await bcrypt.hash(password, 10);
      console.log('Novo hash gerado:', newHash.substring(0, 30) + '...\n');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

testLogin();
