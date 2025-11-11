const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

// Descomentar temporariamente para teste
const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkPlanColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando estrutura da tabela institutions...\n');

    // Verificar colunas da tabela institutions
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'institutions'
      ORDER BY ordinal_position
    `);

    console.log('📊 Colunas da tabela institutions:');
    columns.rows.forEach(col => {
      const nullable = col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL';
      const def = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`   - ${col.column_name}: ${col.data_type} ${nullable}${def}`);
    });
    console.log('');

    // Verificar se plan_id existe
    const hasPlanId = columns.rows.some(col => col.column_name === 'plan_id');
    
    if (!hasPlanId) {
      console.log('⚠️  Coluna "plan_id" não encontrada. Adicionando...\n');
      
      await client.query(`
        ALTER TABLE institutions 
        ADD COLUMN plan_id UUID REFERENCES institution_plans(id) ON DELETE SET NULL;
      `);

      console.log('✅ Coluna "plan_id" adicionada com sucesso!\n');
      
      // Criar índice
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_institutions_plan_id ON institutions(plan_id);
      `);
      
      console.log('✅ Índice criado!\n');
    } else {
      console.log('✅ Coluna "plan_id" já existe!\n');
    }

    // Verificar a instituição teste-fix
    const institution = await client.query(`
      SELECT id, name, slug, plan_id 
      FROM institutions 
      WHERE slug = 'teste-fix'
    `);

    if (institution.rows.length > 0) {
      console.log('📊 Instituição "teste-fix":');
      console.log(JSON.stringify(institution.rows[0], null, 2));
    } else {
      console.log('⚠️  Instituição "teste-fix" não encontrada');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

checkPlanColumn()
  .then(() => {
    console.log('\n✅ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falhou:', error.message);
    process.exit(1);
  });
