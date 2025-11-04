const db = require('./dist/database');

async function checkTenantStructure() {
  try {
    console.log('🔍 Verificando estrutura da tabela tenants...');
    
    const result = await db.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'tenants' 
      ORDER BY ordinal_position
    `);
    
    console.log('Colunas da tabela tenants:');
    result.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Verificar dados existentes
    const tenantsData = await db.query('SELECT * FROM tenants LIMIT 5');
    console.log(`\nTotal de tenants: ${tenantsData.rows.length}`);
    if (tenantsData.rows.length > 0) {
      console.log('Primeiros tenants:');
      tenantsData.rows.forEach((tenant, index) => {
        console.log(`  ${index + 1}. ID: ${tenant.id}, Dados:`, tenant);
      });
    }
    
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

checkTenantStructure().then(() => process.exit(0));