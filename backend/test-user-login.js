const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testUserLogin() {
  try {
    console.log('🔍 Verificando usuário João Silva...\n');

    // Buscar usuário
    const userResult = await pool.query(`
      SELECT u.*, i.name as institution_name, t.name as tenant_name
      FROM usuarios u
      LEFT JOIN institutions i ON u.institution_id = i.id
      LEFT JOIN tenants t ON u.tenant_id = t.id
      WHERE u.email = $1
    `, ['joao.silva@exemplo.gov.br']);

    if (userResult.rows.length === 0) {
      console.log('❌ Usuário não encontrado!');
      return;
    }

    const user = userResult.rows[0];
    console.log('✅ Usuário encontrado:');
    console.log('   ID:', user.id);
    console.log('   Nome:', user.nome);
    console.log('   Email:', user.email);
    console.log('   Tipo:', user.tipo);
    console.log('   Ativo:', user.ativo);
    console.log('   Instituição:', user.institution_name);
    console.log('   Tenant:', user.tenant_name);
    console.log('   Tenant ID:', user.tenant_id);
    console.log('');

    // Testar senha
    console.log('🔐 Testando senha...');
    const senhaCorreta = 'Senha@123';
    const senhaMatch = await bcrypt.compare(senhaCorreta, user.senha);
    
    if (senhaMatch) {
      console.log('✅ Senha correta!');
    } else {
      console.log('❌ Senha incorreta!');
      console.log('   Tentando resetar senha...');
      
      const novaSenhaHash = await bcrypt.hash(senhaCorreta, 10);
      await pool.query(
        'UPDATE usuarios SET senha = $1 WHERE id = $2',
        [novaSenhaHash, user.id]
      );
      
      console.log('✅ Senha resetada para: Senha@123');
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  CREDENCIAIS PARA LOGIN NO SISTEMA PRINCIPAL');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('   URL: http://localhost:5173');
    console.log('   Email: joao.silva@exemplo.gov.br');
    console.log('   Senha: Senha@123');
    console.log('');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

testUserLogin();
