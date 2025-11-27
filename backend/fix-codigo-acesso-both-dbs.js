const { Pool } = require('pg');

const LOCAL_DB = 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar';
const NEON_DB = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function fixConstraint(connectionString, dbName) {
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
    // Remover constraint antiga
    console.log('1️⃣ Removendo constraint antiga...');
    await client.query(`
      ALTER TABLE escolas 
      DROP CONSTRAINT IF EXISTS escolas_codigo_acesso_key
    `);
    console.log('✅ Constraint antiga removida');
    
    // Adicionar nova constraint
    console.log('2️⃣ Adicionando nova constraint (codigo_acesso + tenant_id)...');
    await client.query(`
      ALTER TABLE escolas 
      ADD CONSTRAINT escolas_codigo_acesso_tenant_key 
      UNIQUE (codigo_acesso, tenant_id)
    `);
    console.log('✅ Nova constraint adicionada');
    
    // Verificar
    const constraints = await client.query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'escolas'::regclass
      AND conname LIKE '%codigo_acesso%'
    `);
    
    console.log('\n📋 Constraints de codigo_acesso:');
    constraints.rows.forEach(c => {
      console.log(`  - ${c.constraint_name}: ${c.definition}`);
    });
    
    console.log(`\n✅ ${dbName} processado com sucesso!`);
    
  } catch (error) {
    console.error(`❌ Erro em ${dbName}:`, error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  console.log('🚀 Ajustando constraint de codigo_acesso em ambos os bancos...');
  
  try {
    await fixConstraint(LOCAL_DB, 'BANCO LOCAL');
    await fixConstraint(NEON_DB, 'NEON (Produção)');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ PROCESSO CONCLUÍDO COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('\n📝 Agora:');
    console.log('  • O mesmo codigo_acesso pode ser usado em tenants diferentes');
    console.log('  • Mas não pode ser duplicado dentro do mesmo tenant\n');
    
  } catch (error) {
    console.error('\n❌ Erro durante o processo:', error);
    process.exit(1);
  }
}

main();
