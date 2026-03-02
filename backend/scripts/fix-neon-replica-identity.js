const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixReplicaIdentity() {
  try {
    console.log('🔧 Configurando REPLICA IDENTITY para tabela guias (NEON)...\n');

    // Verificar replica identity atual
    const checkIdentity = await pool.query(`
      SELECT relreplident 
      FROM pg_class 
      WHERE relname = 'guias'
    `);

    console.log('📋 Replica Identity atual:', checkIdentity.rows[0]?.relreplident);
    console.log('   d = default (primary key)');
    console.log('   n = nothing');
    console.log('   f = full');
    console.log('   i = index\n');

    // Configurar replica identity usando a primary key
    await pool.query('ALTER TABLE guias REPLICA IDENTITY USING INDEX guias_pkey');
    console.log('✅ REPLICA IDENTITY configurada para usar guias_pkey');

    // Verificar novamente
    const checkAfter = await pool.query(`
      SELECT relreplident 
      FROM pg_class 
      WHERE relname = 'guias'
    `);

    console.log('\n📋 Replica Identity após alteração:', checkAfter.rows[0]?.relreplident);

    // Verificar se a PK está correta
    const checkPK = await pool.query(`
      SELECT 
        conname,
        contype,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'guias'::regclass
      AND contype = 'p'
    `);

    console.log('\n🔑 Primary Key:');
    if (checkPK.rows.length > 0) {
      console.log(`   Nome: ${checkPK.rows[0].conname}`);
      console.log(`   Definição: ${checkPK.rows[0].definition}`);
    } else {
      console.log('   ❌ Nenhuma PRIMARY KEY encontrada!');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    
    // Se o erro for sobre replica identity, tentar alternativa
    if (error.message.includes('replica identity')) {
      console.log('\n🔄 Tentando método alternativo...');
      try {
        await pool.query('ALTER TABLE guias REPLICA IDENTITY DEFAULT');
        console.log('✅ REPLICA IDENTITY configurada como DEFAULT');
      } catch (err2) {
        console.error('❌ Erro no método alternativo:', err2.message);
      }
    }
  } finally {
    await pool.end();
  }
}

fixReplicaIdentity();
