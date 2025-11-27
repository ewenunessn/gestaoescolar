const { Pool } = require('pg');

const LOCAL_DB = 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar';
const NEON_DB = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function makeNullable(connectionString, dbName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔧 Processando: ${dbName}`);
  console.log('='.repeat(60));
  
  const isNeon = connectionString.includes('neon.tech');
  const pool = new Pool({
    connectionString,
    ssl: isNeon ? { rejectUnauthorized: false } : false
  });

  const client = await pool.connect();
  
  try {
    // Verificar estado atual
    const checkBefore = await client.query(`
      SELECT is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'usuarios' 
      AND column_name = 'tenant_id'
    `);
    
    if (checkBefore.rows[0]?.is_nullable === 'YES') {
      console.log('✅ Coluna tenant_id já permite NULL!');
    } else {
      console.log('🔧 Tornando coluna tenant_id nullable...');
      
      await client.query(`
        ALTER TABLE usuarios 
        ALTER COLUMN tenant_id DROP NOT NULL
      `);
      
      console.log('✅ Coluna tenant_id agora permite NULL!');
    }
    
    // Verificar
    const checkAfter = await client.query(`
      SELECT is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'usuarios' 
      AND column_name = 'tenant_id'
    `);
    
    console.log(`\n📋 Status final: ${checkAfter.rows[0].is_nullable === 'YES' ? 'NULL permitido ✅' : 'NOT NULL ❌'}`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  console.log('🚀 Tornando tenant_id nullable em ambos os bancos...');
  
  try {
    await makeNullable(LOCAL_DB, 'BANCO LOCAL');
    await makeNullable(NEON_DB, 'NEON (Produção)');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ PROCESSO CONCLUÍDO COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('\n📝 Agora você pode criar usuários sem especificar tenant_id.');
    console.log('   A associação com tenants será feita através da tabela tenant_users.\n');
    
  } catch (error) {
    console.error('\n❌ Erro durante o processo:', error);
    process.exit(1);
  }
}

main();
