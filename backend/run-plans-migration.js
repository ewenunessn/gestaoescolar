const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Executando migração de planos...\n');

    const migrationPath = path.join(__dirname, 'migrations', '016_add_institution_plans.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    await client.query(migrationSQL);
    console.log('✅ Migration executada com sucesso!\n');

    // Verificar planos criados
    const plansResult = await client.query(`
      SELECT id, name, slug, price, max_users, max_schools, max_tenants 
      FROM institution_plans 
      ORDER BY display_order
    `);

    console.log('📋 Planos disponíveis:\n');
    plansResult.rows.forEach(plan => {
      console.log(`  ${plan.name} (${plan.slug})`);
      console.log(`    Preço: R$ ${plan.price}/mês`);
      console.log(`    Limites: ${plan.max_users} usuários, ${plan.max_schools} escolas, ${plan.max_tenants} tenants`);
      console.log('');
    });

    // Verificar instituições com planos
    const institutionsResult = await client.query(`
      SELECT i.name, i.slug, p.name as plan_name, i.limits
      FROM institutions i
      LEFT JOIN institution_plans p ON i.plan_id = p.id
      ORDER BY i.created_at
    `);

    console.log('🏛️  Instituições e seus planos:\n');
    institutionsResult.rows.forEach(inst => {
      console.log(`  ${inst.name}`);
      console.log(`    Plano: ${inst.plan_name || 'Nenhum'}`);
      console.log(`    Limites: ${JSON.stringify(inst.limits)}`);
      console.log('');
    });

    console.log('✅ Migração concluída!');

  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
