const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const localPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/gestaoescolar'
});

async function testLocalStructure() {
  const client = await localPool.connect();
  
  try {
    console.log('🔍 TESTE DE ESTRUTURA NO BANCO LOCAL\n');

    // 1. Verificar colunas da tabela tenants
    console.log('1️⃣ COLUNAS DA TABELA TENANTS');
    console.log('-'.repeat(80));
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'tenants'
      ORDER BY ordinal_position
    `);

    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
    });

    // 2. Testar query do listTenants
    console.log('\n2️⃣ TESTANDO QUERY listTenants()');
    console.log('-'.repeat(80));
    
    try {
      const result = await client.query(`
        SELECT 
          id,
          slug,
          name,
          domain,
          slug as subdomain,
          institution_id,
          status,
          settings,
          limits,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM tenants 
        WHERE 1=1
        ORDER BY created_at DESC
        LIMIT 3
      `);

      console.log(`✅ Query executada com sucesso!`);
      console.log(`📊 Retornou ${result.rows.length} tenants\n`);

      result.rows.forEach((tenant, index) => {
        console.log(`Tenant ${index + 1}:`);
        console.log(`  - ID: ${tenant.id}`);
        console.log(`  - Name: ${tenant.name}`);
        console.log(`  - Slug: ${tenant.slug}`);
        console.log(`  - Institution ID: ${tenant.institution_id || '❌ NULL'}`);
        console.log(`  - Domain: ${tenant.domain || 'NULL'}`);
        console.log(`  - Settings: ${tenant.settings ? 'Presente' : '❌ NULL'}`);
        console.log(`  - Limits: ${tenant.limits ? 'Presente' : '❌ NULL'}`);
        console.log();
      });

    } catch (queryError) {
      console.log('❌ Erro na query:', queryError.message);
    }

    // 3. Verificar se as colunas existem
    console.log('3️⃣ VERIFICAÇÃO DE COLUNAS CRÍTICAS');
    console.log('-'.repeat(80));
    
    const criticalColumns = ['institution_id', 'settings', 'limits', 'domain'];
    const existingColumns = columns.rows.map(c => c.column_name);
    
    criticalColumns.forEach(col => {
      const exists = existingColumns.includes(col);
      console.log(`${exists ? '✅' : '❌'} ${col}: ${exists ? 'Existe' : 'NÃO existe'}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await localPool.end();
  }
}

testLocalStructure()
  .then(() => {
    console.log('\n✅ Teste concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Teste falhou:', error.message);
    process.exit(1);
  });
