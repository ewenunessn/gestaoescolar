const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkBrendaInstitution() {
  console.log('🔍 Verificando instituição da Brenda...\n');
  
  try {
    // Verificar usuária Brenda
    const userResult = await pool.query(
      'SELECT id, nome, email, tipo, institution_id FROM usuarios WHERE email = $1',
      ['ewertonsolon@gmail.com']
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuária Brenda não encontrada');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('👤 Usuária Brenda:');
    console.log(JSON.stringify(user, null, 2));
    console.log();
    
    // Verificar se a instituição existe
    const instResult = await pool.query(
      'SELECT id, name, slug, subdomain, plan_id FROM institutions WHERE id = $1',
      [user.institution_id]
    );
    
    if (instResult.rows.length === 0) {
      console.log('❌ Instituição não encontrada!');
      console.log('🔧 A usuária tem institution_id mas a instituição não existe no banco');
      console.log();
      
      // Listar instituições disponíveis
      const allInst = await pool.query(
        'SELECT id, name, slug, subdomain FROM institutions ORDER BY created_at DESC LIMIT 5'
      );
      
      console.log('📋 Instituições disponíveis:');
      allInst.rows.forEach(inst => {
        console.log(`  - ${inst.name} (${inst.slug}) - ID: ${inst.id}`);
      });
      console.log();
      
      // Sugerir correção
      if (allInst.rows.length > 0) {
        const firstInst = allInst.rows[0];
        console.log('💡 Sugestão: Atualizar Brenda para a instituição:', firstInst.name);
        console.log(`   UPDATE usuarios SET institution_id = '${firstInst.id}' WHERE email = 'ewertonsolon@gmail.com';`);
      }
    } else {
      console.log('✅ Instituição encontrada:');
      console.log(JSON.stringify(instResult.rows[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkBrendaInstitution();
