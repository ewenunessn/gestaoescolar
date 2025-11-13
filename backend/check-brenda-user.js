const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkBrendaUser() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando usuária Brenda...\n');

    // Buscar usuária
    const user = await client.query(`
      SELECT id, nome, email, tipo, institution_id, tenant_id, ativo
      FROM usuarios 
      WHERE email = 'ewertonsolon@gmail.com'
    `);

    if (user.rows.length === 0) {
      console.log('❌ Usuária não encontrada\n');
      return;
    }

    console.log('📊 Dados da usuária:');
    console.log(JSON.stringify(user.rows[0], null, 2));
    console.log('');

    const userData = user.rows[0];

    if (!userData.institution_id) {
      console.log('⚠️  Usuária sem institution_id. Atualizando para instituição teste-fix...\n');
      
      await client.query(`
        UPDATE usuarios 
        SET institution_id = '069c3667-4279-4d63-b771-bb2bc1c9d833'
        WHERE id = $1
      `, [userData.id]);

      console.log('✅ institution_id atualizado!\n');

      // Verificar se já tem associação com a instituição
      const institutionUser = await client.query(`
        SELECT * FROM institution_users 
        WHERE institution_id = '069c3667-4279-4d63-b771-bb2bc1c9d833' AND user_id = $1
      `, [userData.id]);

      if (institutionUser.rows.length === 0) {
        console.log('➕ Criando associação com a instituição...');
        await client.query(`
          INSERT INTO institution_users (institution_id, user_id, role, status)
          VALUES ('069c3667-4279-4d63-b771-bb2bc1c9d833', $1, 'institution_admin', 'active')
        `, [userData.id]);
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
      console.log('✅ Usuária já tem institution_id:', userData.institution_id);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

checkBrendaUser()
  .then(() => {
    console.log('\n✅ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falhou:', error.message);
    process.exit(1);
  });
