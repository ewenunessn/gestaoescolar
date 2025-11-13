const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkEwertonUser() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando usuário Ewerton...\n');

    // Buscar usuário
    const user = await client.query(`
      SELECT id, nome, email, tipo, institution_id, tenant_id, ativo
      FROM usuarios 
      WHERE email = 'ewenunes0@gmail.com'
    `);

    if (user.rows.length === 0) {
      console.log('❌ Usuário não encontrado\n');
      return;
    }

    console.log('📊 Dados do usuário:');
    console.log(JSON.stringify(user.rows[0], null, 2));
    console.log('');

    const userData = user.rows[0];

    if (!userData.institution_id || userData.institution_id === '00000000-0000-0000-0000-000000000001') {
      console.log('⚠️ Usuário sem institution_id válido. Atualizando...\n');
      
      // Buscar primeira instituição disponível
      const inst = await client.query(`
        SELECT id, name, slug FROM institutions ORDER BY created_at DESC LIMIT 1
      `);
      
      if (inst.rows.length === 0) {
        console.log('❌ Nenhuma instituição disponível');
        return;
      }
      
      const institution = inst.rows[0];
      console.log('✅ Usando instituição:', institution.name);
      console.log('   ID:', institution.id);
      console.log();
      
      await client.query(`
        UPDATE usuarios 
        SET institution_id = $1
        WHERE id = $2
      `, [institution.id, userData.id]);

      console.log('✅ institution_id atualizado!\n');

      // Verificar se já tem associação com a instituição
      const institutionUser = await client.query(`
        SELECT * FROM institution_users 
        WHERE institution_id = $1 AND user_id = $2
      `, [institution.id, userData.id]);

      if (institutionUser.rows.length === 0) {
        console.log('➕ Criando associação com a instituição...');
        await client.query(`
          INSERT INTO institution_users (institution_id, user_id, role, status)
          VALUES ($1, $2, 'institution_admin', 'active')
        `, [institution.id, userData.id]);
        console.log('✅ Associação criada!\n');
      } else {
        console.log('✅ Associação já existe!\n');
      }

      // Verificar dados finais
      const finalUser = await client.query(`
        SELECT id, nome, email, tipo, institution_id, tenant_id
        FROM usuarios 
        WHERE id = $1
      `, [userData.id]);

      console.log('📊 Dados finais:');
      console.log(JSON.stringify(finalUser.rows[0], null, 2));
    } else {
      console.log('✅ Usuário já tem institution_id válido:', userData.institution_id);
      
      // Verificar qual instituição
      const inst = await client.query(`
        SELECT id, name, slug FROM institutions WHERE id = $1
      `, [userData.institution_id]);
      
      if (inst.rows.length > 0) {
        console.log('✅ Instituição:', inst.rows[0].name);
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

checkEwertonUser()
  .then(() => {
    console.log('\n✅ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falhou:', error.message);
    process.exit(1);
  });
