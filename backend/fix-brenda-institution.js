const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function fixBrendaInstitution() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Corrigindo instituição da Brenda...\n');

    // Buscar primeira instituição válida
    const instResult = await client.query(`
      SELECT id, name, slug
      FROM institutions 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (instResult.rows.length === 0) {
      console.log('❌ Nenhuma instituição encontrada no banco');
      return;
    }

    const institution = instResult.rows[0];
    console.log('✅ Instituição encontrada:', institution.name);
    console.log('   ID:', institution.id);
    console.log('   Slug:', institution.slug);
    console.log();

    // Atualizar Brenda
    await client.query(`
      UPDATE usuarios 
      SET institution_id = $1
      WHERE email = 'ewertonsolon@gmail.com'
    `, [institution.id]);

    console.log('✅ institution_id da Brenda atualizado!\n');

    // Verificar se já tem associação
    const userResult = await client.query(`
      SELECT id FROM usuarios WHERE email = 'ewertonsolon@gmail.com'
    `);
    const userId = userResult.rows[0].id;

    const assocResult = await client.query(`
      SELECT * FROM institution_users 
      WHERE institution_id = $1 AND user_id = $2
    `, [institution.id, userId]);

    if (assocResult.rows.length === 0) {
      console.log('➕ Criando associação institution_users...');
      await client.query(`
        INSERT INTO institution_users (institution_id, user_id, role, status)
        VALUES ($1, $2, 'institution_admin', 'active')
      `, [institution.id, userId]);
      console.log('✅ Associação criada!\n');
    } else {
      console.log('✅ Associação já existe!\n');
    }

    // Buscar tenants da instituição
    const tenantsResult = await client.query(`
      SELECT id, name, slug FROM tenants WHERE institution_id = $1
    `, [institution.id]);

    console.log(`📋 Tenants disponíveis (${tenantsResult.rows.length}):`);
    tenantsResult.rows.forEach(t => {
      console.log(`   - ${t.name} (${t.slug})`);
    });
    console.log();

    // Verificar dados finais
    const finalUser = await client.query(`
      SELECT u.id, u.nome, u.email, u.tipo, u.institution_id, i.name as institution_name
      FROM usuarios u
      LEFT JOIN institutions i ON i.id = u.institution_id
      WHERE u.email = 'ewertonsolon@gmail.com'
    `);

    console.log('📊 Dados finais da Brenda:');
    console.log(JSON.stringify(finalUser.rows[0], null, 2));

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

fixBrendaInstitution()
  .then(() => {
    console.log('\n✅ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falhou:', error.message);
    process.exit(1);
  });
