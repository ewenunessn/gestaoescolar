const { Pool } = require('pg');

const connectionString = 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar';

const pool = new Pool({
  connectionString,
  ssl: false
});

async function fixConstraint() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Ajustando constraint de codigo_acesso...\n');
    
    // Remover constraint antiga (UNIQUE global)
    console.log('1️⃣ Removendo constraint antiga...');
    await client.query(`
      ALTER TABLE escolas 
      DROP CONSTRAINT IF EXISTS escolas_codigo_acesso_key
    `);
    console.log('✅ Constraint antiga removida\n');
    
    // Adicionar nova constraint (UNIQUE por tenant)
    console.log('2️⃣ Adicionando nova constraint (codigo_acesso + tenant_id)...');
    await client.query(`
      ALTER TABLE escolas 
      ADD CONSTRAINT escolas_codigo_acesso_tenant_key 
      UNIQUE (codigo_acesso, tenant_id)
    `);
    console.log('✅ Nova constraint adicionada\n');
    
    // Verificar
    const constraints = await client.query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'escolas'::regclass
      AND conname LIKE '%codigo_acesso%'
    `);
    
    console.log('📋 Constraints de codigo_acesso:');
    constraints.rows.forEach(c => {
      console.log(`  - ${c.constraint_name}`);
      console.log(`    ${c.definition}\n`);
    });
    
    console.log('✅ Agora o mesmo codigo_acesso pode ser usado em tenants diferentes!');
    console.log('   Mas não pode ser duplicado dentro do mesmo tenant.\n');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixConstraint();
