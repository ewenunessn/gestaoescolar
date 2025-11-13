const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

// Conexão Neon
const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

// Conexão Local
const localPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/gestaoescolar'
});

async function syncBrendaToNeon() {
  const neonClient = await neonPool.connect();
  const localClient = await localPool.connect();
  
  try {
    console.log('🔄 Sincronizando dados da Brenda do Local para Neon...\n');

    // 1. Buscar dados da Brenda no banco local
    console.log('📊 Buscando dados da Brenda no banco LOCAL...');
    const localUser = await localClient.query(`
      SELECT id, nome, email, tipo, institution_id, tenant_id, ativo
      FROM usuarios 
      WHERE email = 'ewertonsolon@gmail.com'
    `);

    if (localUser.rows.length === 0) {
      console.log('❌ Brenda não encontrada no banco local');
      return;
    }

    console.log('✅ Brenda encontrada no LOCAL:');
    console.log(JSON.stringify(localUser.rows[0], null, 2));
    console.log();

    // 2. Atualizar no Neon
    console.log('📝 Atualizando Brenda no NEON...');
    const brendaLocal = localUser.rows[0];
    
    await neonClient.query(`
      UPDATE usuarios 
      SET institution_id = $1, tenant_id = $2
      WHERE email = 'ewertonsolon@gmail.com'
    `, [brendaLocal.institution_id, brendaLocal.tenant_id]);

    console.log('✅ Brenda atualizada no NEON!');
    console.log();

    // 3. Verificar dados no Neon
    console.log('🔍 Verificando dados da Brenda no NEON...');
    const neonUser = await neonClient.query(`
      SELECT id, nome, email, tipo, institution_id, tenant_id, ativo
      FROM usuarios 
      WHERE email = 'ewertonsolon@gmail.com'
    `);

    console.log('📊 Brenda no NEON:');
    console.log(JSON.stringify(neonUser.rows[0], null, 2));
    console.log();

    // 4. Verificar associação institution_users no Neon
    console.log('🔍 Verificando associação institution_users no NEON...');
    const neonAssoc = await neonClient.query(`
      SELECT * FROM institution_users 
      WHERE user_id = $1
    `, [neonUser.rows[0].id]);

    if (neonAssoc.rows.length === 0 && brendaLocal.institution_id) {
      console.log('➕ Criando associação institution_users no NEON...');
      await neonClient.query(`
        INSERT INTO institution_users (institution_id, user_id, role, status)
        VALUES ($1, $2, 'institution_admin', 'active')
        ON CONFLICT (institution_id, user_id) DO NOTHING
      `, [brendaLocal.institution_id, neonUser.rows[0].id]);
      console.log('✅ Associação criada!');
    } else {
      console.log('✅ Associação já existe no NEON');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    neonClient.release();
    localClient.release();
    await neonPool.end();
    await localPool.end();
  }
}

syncBrendaToNeon()
  .then(() => {
    console.log('\n✅ Sincronização concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Sincronização falhou:', error.message);
    process.exit(1);
  });
