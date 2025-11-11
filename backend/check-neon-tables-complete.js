// Verificar todas as tabelas necessárias no Neon
const { Pool } = require('pg');

const NEON_URL = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: NEON_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkTables() {
  try {
    console.log('🔍 Verificando tabelas no Neon...\n');
    
    const requiredTables = [
      'system_admins',
      'institutions',
      'tenants',
      'institution_plans',
      'usuarios'
    ];
    
    for (const table of requiredTables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        );
      `, [table]);
      
      const exists = result.rows[0].exists;
      
      if (exists) {
        // Contar registros
        const count = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`✅ ${table.padEnd(25)} (${count.rows[0].count} registros)`);
      } else {
        console.log(`❌ ${table.padEnd(25)} NÃO EXISTE`);
      }
    }
    
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
