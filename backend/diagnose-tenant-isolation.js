/**
 * Diagnostic script to check tenant isolation in inventory system
 */

const db = require('./src/database');

async function diagnoseTenantIsolation() {
  console.log('🔍 Diagnosing Tenant Isolation Issues...\n');

  try {
    // Check tenants
    console.log('1. Checking available tenants...');
    const tenants = await db.query('SELECT id, name, slug FROM tenants ORDER BY created_at');
    console.log(`   Found ${tenants.rows.length} tenants:`);
    tenants.rows.forEach(tenant => {
      console.log(`   - ${tenant.name} (${tenant.slug}) - ID: ${tenant.id}`);
    });

    if (tenants.rows.length < 2) {
      console.log('   ⚠️  Need at least 2 tenants to test isolation');
      return;
    }

    const tenant1 = tenants.rows[0];
    const tenant2 = tenants.rows[1];

    // Check schools per tenant
    console.log('\n2. Checking schools per tenant...');
    for (const tenant of [tenant1, tenant2]) {
      const schools = await db.query(
        'SELECT id, nome FROM escolas WHERE tenant_id = $1 AND ativo = true',
        [tenant.id]
      );
      console.log(`   Tenant "${tenant.name}": ${schools.rows.length} schools`);
      schools.rows.forEach(school => {
        console.log(`     - ${school.nome} (ID: ${school.id})`);
      });
    }

    // Check products per tenant
    console.log('\n3. Checking products per tenant...');
    for (const tenant of [tenant1, tenant2]) {
      const products = await db.query(
        'SELECT id, nome FROM produtos WHERE tenant_id = $1 AND ativo = true',
        [tenant.id]
      );
      console.log(`   Tenant "${tenant.name}": ${products.rows.length} products`);
      if (products.rows.length > 5) {
        console.log(`     - Showing first 5: ${products.rows.slice(0, 5).map(p => p.nome).join(', ')}`);
      } else {
        products.rows.forEach(product => {
          console.log(`     - ${product.nome} (ID: ${product.id})`);
        });
      }
    }

    // Check inventory per tenant
    console.log('\n4. Checking inventory per tenant...');
    for (const tenant of [tenant1, tenant2]) {
      const inventory = await db.query(`
        SELECT 
          ee.id,
          ee.quantidade_atual,
          p.nome as produto_nome,
          e.nome as escola_nome
        FROM estoque_escolas ee
        JOIN produtos p ON p.id = ee.produto_id
        JOIN escolas e ON e.id = ee.escola_id
        WHERE e.tenant_id = $1 AND ee.quantidade_atual > 0
        LIMIT 10
      `, [tenant.id]);
      
      console.log(`   Tenant "${tenant.name}": ${inventory.rows.length} inventory items with stock`);
      inventory.rows.forEach(item => {
        console.log(`     - ${item.produto_nome} at ${item.escola_nome}: ${item.quantidade_atual}`);
      });
    }

    // Check for cross-tenant data leakage
    console.log('\n5. Checking for potential data leakage...');
    
    // Check if there are products without tenant_id
    const orphanProducts = await db.query(
      'SELECT id, nome FROM produtos WHERE tenant_id IS NULL AND ativo = true'
    );
    if (orphanProducts.rows.length > 0) {
      console.log(`   ⚠️  Found ${orphanProducts.rows.length} products without tenant_id:`);
      orphanProducts.rows.forEach(product => {
        console.log(`     - ${product.nome} (ID: ${product.id})`);
      });
    } else {
      console.log('   ✅ All products have tenant_id');
    }

    // Check if there are schools without tenant_id
    const orphanSchools = await db.query(
      'SELECT id, nome FROM escolas WHERE tenant_id IS NULL AND ativo = true'
    );
    if (orphanSchools.rows.length > 0) {
      console.log(`   ⚠️  Found ${orphanSchools.rows.length} schools without tenant_id:`);
      orphanSchools.rows.forEach(school => {
        console.log(`     - ${school.nome} (ID: ${school.id})`);
      });
    } else {
      console.log('   ✅ All schools have tenant_id');
    }

    // Check inventory items that might be cross-tenant
    const crossTenantInventory = await db.query(`
      SELECT 
        ee.id,
        ee.quantidade_atual,
        p.nome as produto_nome,
        p.tenant_id as produto_tenant,
        e.nome as escola_nome,
        e.tenant_id as escola_tenant
      FROM estoque_escolas ee
      JOIN produtos p ON p.id = ee.produto_id
      JOIN escolas e ON e.id = ee.escola_id
      WHERE p.tenant_id != e.tenant_id
      LIMIT 10
    `);
    
    if (crossTenantInventory.rows.length > 0) {
      console.log(`   ⚠️  Found ${crossTenantInventory.rows.length} cross-tenant inventory items:`);
      crossTenantInventory.rows.forEach(item => {
        console.log(`     - ${item.produto_nome} (tenant: ${item.produto_tenant}) at ${item.escola_nome} (tenant: ${item.escola_tenant})`);
      });
    } else {
      console.log('   ✅ No cross-tenant inventory items found');
    }

    console.log('\n📊 Diagnosis Summary:');
    console.log(`   - Tenants: ${tenants.rows.length}`);
    console.log(`   - Orphan products: ${orphanProducts.rows.length}`);
    console.log(`   - Orphan schools: ${orphanSchools.rows.length}`);
    console.log(`   - Cross-tenant inventory: ${crossTenantInventory.rows.length}`);

    if (orphanProducts.rows.length === 0 && orphanSchools.rows.length === 0 && crossTenantInventory.rows.length === 0) {
      console.log('\n✅ Tenant isolation appears to be working correctly at the database level.');
      console.log('   If you\'re still seeing cross-tenant data, the issue might be:');
      console.log('   1. Frontend not sending correct tenant headers');
      console.log('   2. Middleware not setting tenant context properly');
      console.log('   3. Some API endpoints not using tenant validation');
    } else {
      console.log('\n⚠️  Found potential tenant isolation issues.');
      console.log('   Consider running data migration scripts to fix orphaned records.');
    }

  } catch (error) {
    console.error('❌ Error during diagnosis:', error.message);
  }
}

// Run diagnosis
diagnoseTenantIsolation().then(() => {
  console.log('\n🏁 Diagnosis complete.');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});