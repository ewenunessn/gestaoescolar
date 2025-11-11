const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkPlansTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando tabela de planos...\n');

    // Verificar se a tabela existe
    const tableExists = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'institution_plans'
    `);

    if (tableExists.rows.length === 0) {
      console.log('⚠️  Tabela "institution_plans" não encontrada!\n');
      return;
    }

    // Verificar estrutura
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'institution_plans'
      ORDER BY ordinal_position
    `);

    console.log('📊 Estrutura da tabela institution_plans:');
    columns.rows.forEach(col => {
      const nullable = col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL';
      console.log(`   - ${col.column_name}: ${col.data_type} ${nullable}`);
    });
    console.log('');

    // Listar planos
    const plans = await client.query(`
      SELECT * FROM institution_plans ORDER BY id
    `);

    console.log(`📋 Planos cadastrados (${plans.rows.length}):`);
    plans.rows.forEach(plan => {
      console.log(`\n   ID: ${plan.id}`);
      console.log(`   Nome: ${plan.name}`);
      console.log(`   Preço: R$ ${plan.price}/mês`);
      console.log(`   Limites: ${plan.max_users} usuários, ${plan.max_schools} escolas, ${plan.max_tenants} tenants`);
    });
    console.log('');

    // Verificar instituição com plano
    const institutionWithPlan = await client.query(`
      SELECT 
        i.id,
        i.name,
        i.slug,
        i.plan_id,
        p.name as plan_name,
        p.price as plan_price
      FROM institutions i
      LEFT JOIN institution_plans p ON p.id = i.plan_id
      WHERE i.slug = 'teste-fix'
    `);

    if (institutionWithPlan.rows.length > 0) {
      console.log('📊 Instituição "teste-fix" com plano:');
      console.log(JSON.stringify(institutionWithPlan.rows[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

checkPlansTable()
  .then(() => {
    console.log('\n✅ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falhou:', error.message);
    process.exit(1);
  });
