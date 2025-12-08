const { Pool } = require('pg');

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

async function checkForeignKeys() {
  console.log('🔍 Verificando foreign keys e constraints...\n');
  
  const institutionId = 'c1c7aabd-7f03-43ab-8d6d-ff003ea9005f';
  
  try {
    // 1. Verificar se a instituição existe
    console.log('1️⃣ Verificando instituição...');
    const inst = await neonPool.query(
      'SELECT id, name FROM institutions WHERE id = $1',
      [institutionId]
    );
    
    if (inst.rows.length === 0) {
      console.log('❌ Instituição NÃO EXISTE!');
      return;
    }
    console.log('✅ Instituição existe:', inst.rows[0].name);
    
    // 2. Verificar constraints da tabela usuarios
    console.log('\n2️⃣ Verificando constraints da tabela usuarios...');
    const constraints = await neonPool.query(`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'usuarios'
        AND tc.constraint_type = 'FOREIGN KEY'
    `);
    
    console.log('   Foreign keys encontradas:');
    constraints.rows.forEach(row => {
      console.log(`   - ${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
    });
    
    // 3. Verificar se institution_id tem foreign key
    console.log('\n3️⃣ Verificando foreign key de institution_id...');
    const instFK = constraints.rows.find(r => r.column_name === 'institution_id');
    
    if (instFK) {
      console.log('✅ Foreign key existe:', instFK.constraint_name);
      console.log('   Referencia:', `${instFK.foreign_table_name}.${instFK.foreign_column_name}`);
      
      // Verificar se a instituição existe na tabela referenciada
      const check = await neonPool.query(
        `SELECT id FROM ${instFK.foreign_table_name} WHERE id = $1`,
        [institutionId]
      );
      
      if (check.rows.length > 0) {
        console.log('✅ Instituição existe na tabela referenciada');
      } else {
        console.log('❌ Instituição NÃO existe na tabela referenciada!');
      }
    } else {
      console.log('⚠️  Nenhuma foreign key para institution_id');
    }
    
    // 4. Verificar se tenant_id tem foreign key
    console.log('\n4️⃣ Verificando foreign key de tenant_id...');
    const tenantFK = constraints.rows.find(r => r.column_name === 'tenant_id');
    
    if (tenantFK) {
      console.log('✅ Foreign key existe:', tenantFK.constraint_name);
      console.log('   Referencia:', `${tenantFK.foreign_table_name}.${tenantFK.foreign_column_name}`);
      console.log('⚠️  ATENÇÃO: Não estamos passando tenant_id, mas a constraint pode estar exigindo!');
    } else {
      console.log('⚠️  Nenhuma foreign key para tenant_id');
    }
    
    // 5. Verificar constraints da tabela institution_users
    console.log('\n5️⃣ Verificando constraints da tabela institution_users...');
    const instUserConstraints = await neonPool.query(`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'institution_users'
        AND tc.constraint_type = 'FOREIGN KEY'
    `);
    
    console.log('   Foreign keys encontradas:');
    instUserConstraints.rows.forEach(row => {
      console.log(`   - ${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('   Código:', error.code);
    console.error('   Detalhe:', error.detail);
  } finally {
    await neonPool.end();
  }
}

checkForeignKeys();
