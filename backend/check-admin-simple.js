require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.query('SELECT id, name, email, role, status FROM system_admins ORDER BY created_at DESC')
  .then(result => {
    console.log(`\n✅ ${result.rows.length} admin(s) encontrado(s) no Neon:\n`);
    result.rows.forEach(admin => {
      console.log(`👤 ${admin.name}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Status: ${admin.status}\n`);
    });
    
    if (result.rows.length === 0) {
      console.log('❌ Nenhum admin cadastrado!');
      console.log('💡 Execute: node create-system-admin.js\n');
    } else {
      console.log('🔑 Credenciais padrão (se não alteradas):');
      console.log('   Email: admin@sistema.com');
      console.log('   Senha: Admin@123\n');
    }
    
    pool.end();
  })
  .catch(error => {
    console.error('❌ Erro:', error.message);
    if (error.message.includes('does not exist')) {
      console.log('\n💡 Tabela não existe. Execute: node create-system-admin.js\n');
    }
    pool.end();
  });
