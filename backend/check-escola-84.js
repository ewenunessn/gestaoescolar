const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alimentacao_escolar',
  password: process.env.DB_PASSWORD || 'admin123',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

const db = {
  query: (text, params) => pool.query(text, params),
  end: () => pool.end()
};

async function checkEscola84() {
  try {
    console.log('🔍 Verificando escola ID 84...\n');

    const escola = await db.query(`SELECT id, nome, tenant_id, ativo FROM escolas WHERE id = 84`);
    
    if (escola.rows.length === 0) {
      console.log('❌ Escola 84 não encontrada!');
      return;
    }

    const escolaData = escola.rows[0];
    console.log('📍 Escola:', escolaData);

    const tenant = await db.query(`SELECT id, name, slug FROM tenants WHERE id = $1`, [escolaData.tenant_id]);
    if (tenant.rows.length > 0) {
      console.log('\n🏢 Tenant:', tenant.rows[0]);
    }

    const tenantBenevides = '6b95b81f-8d1f-44b0-912c-68c2fdde9841';
    
    if (escolaData.tenant_id !== tenantBenevides) {
      console.log(`\n⚠️  Escola está no tenant ERRADO!`);
      console.log(`   Atual: ${escolaData.tenant_id}`);
      console.log(`   Esperado: ${tenantBenevides} (Secretaria de Benevides)`);
      
      if (process.argv.includes('--fix')) {
        console.log('\n🔧 Corrigindo...');
        await db.query(`UPDATE escolas SET tenant_id = $1 WHERE id = 84`, [tenantBenevides]);
        console.log('✅ Escola 84 corrigida!');
      } else {
        console.log('\n💡 Execute com --fix para corrigir');
      }
    } else {
      console.log('\n✅ Escola está no tenant correto!');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await db.end();
  }
}

checkEscola84();
