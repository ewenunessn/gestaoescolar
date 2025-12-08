const { Pool } = require('pg');

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

async function checkCreatorUserId() {
  console.log('🔍 Verificando creatorUserId...\n');
  
  try {
    // Verificar se o user_id 9 existe (admin do sistema)
    console.log('1️⃣ Verificando se user_id 9 existe...');
    const user = await neonPool.query(
      'SELECT id, nome, email FROM usuarios WHERE id = $1',
      [9]
    );
    
    if (user.rows.length > 0) {
      console.log('✅ Usuário 9 existe:', user.rows[0].nome, '-', user.rows[0].email);
    } else {
      console.log('❌ Usuário 9 NÃO EXISTE!');
      console.log('   Isso pode causar erro 23503 no audit log');
    }
    
    // Verificar constraint do audit log
    console.log('\n2️⃣ Verificando constraints do audit log...');
    const constraints = await neonPool.query(`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'institution_audit_log'
        AND tc.constraint_type = 'FOREIGN KEY'
    `);
    
    console.log('   Foreign keys:');
    constraints.rows.forEach(row => {
      console.log(`   - ${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
    });
    
    // Verificar se user_id no audit log pode ser NULL
    console.log('\n3️⃣ Verificando se user_id pode ser NULL no audit log...');
    const column = await neonPool.query(`
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_name = 'institution_audit_log'
        AND column_name = 'user_id'
    `);
    
    console.log('   user_id nullable:', column.rows[0].is_nullable);
    
    if (column.rows[0].is_nullable === 'YES') {
      console.log('✅ user_id pode ser NULL - podemos passar NULL se não houver creatorUserId');
    } else {
      console.log('❌ user_id NÃO pode ser NULL - precisa sempre passar um ID válido');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await neonPool.end();
  }
}

checkCreatorUserId();
