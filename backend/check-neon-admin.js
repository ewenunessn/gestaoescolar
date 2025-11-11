// Verificar admins no banco Neon
const { Pool } = require('pg');

const NEON_URL = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: NEON_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkAdmins() {
  try {
    console.log('🔍 Verificando admins no Neon...\n');
    
    const result = await pool.query(`
      SELECT id, name, email, role, status, created_at 
      FROM system_admins 
      ORDER BY created_at DESC
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Nenhum admin cadastrado no Neon!\n');
      console.log('💡 Para criar um admin, execute:');
      console.log('   node backend/create-neon-admin.js\n');
    } else {
      console.log(`✅ ${result.rows.length} admin(s) encontrado(s):\n`);
      
      result.rows.forEach((admin, i) => {
        console.log(`${i + 1}. 👤 ${admin.name}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Role: ${admin.role}`);
        console.log(`   Status: ${admin.status}`);
        console.log(`   Criado: ${new Date(admin.created_at).toLocaleString('pt-BR')}\n`);
      });
      
      console.log('═══════════════════════════════════════════════════════');
      console.log('  🔑 CREDENCIAIS PADRÃO (se não alteradas)');
      console.log('═══════════════════════════════════════════════════════\n');
      console.log('   Email: admin@sistema.com');
      console.log('   Senha: Admin@123\n');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    
    if (error.message.includes('does not exist')) {
      console.log('\n💡 Tabela system_admins não existe no Neon!');
      console.log('   Execute: node backend/create-neon-admin.js\n');
    }
  } finally {
    await pool.end();
  }
}

checkAdmins();
