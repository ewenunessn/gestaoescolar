require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const db = {
  query: (text, params) => pool.query(text, params),
  end: () => pool.end()
};

async function checkUsuarios() {
  console.log('🔍 Verificando usuários cadastrados...\n');

  const result = await db.query(`
    SELECT 
      u.id,
      u.nome,
      u.email,
      t.id as tenant_id,
      t.nome as tenant_nome
    FROM usuarios u
    LEFT JOIN usuarios_tenants ut ON u.id = ut.usuario_id
    LEFT JOIN tenants t ON ut.tenant_id = t.id
    ORDER BY u.email, t.nome
  `);

  console.log(`📊 Total de usuários: ${result.rows.length}\n`);

  let currentEmail = '';
  result.rows.forEach(row => {
    if (row.email !== currentEmail) {
      console.log(`\n👤 ${row.nome} (${row.email})`);
      currentEmail = row.email;
    }
    if (row.tenant_nome) {
      console.log(`   └─ Tenant: ${row.tenant_nome} (${row.tenant_id.substring(0, 8)}...)`);
    }
  });

  await db.end();
}

checkUsuarios().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
