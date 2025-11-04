/**
 * Test tenant configuration system
 */

// Load environment variables
require('dotenv').config();

const { Pool } = require('pg');

// Database configuration
let pool;

if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    pool = new Pool({
        connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });
} else {
    const dbConfig = {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'alimentacao_escolar',
        password: process.env.DB_PASSWORD || 'admin123',
        port: parseInt(process.env.DB_PORT || '5432'),
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    };
    pool = new Pool(dbConfig);
}

const db = {
    query: async (text, params = []) => {
        return await pool.query(text, params);
    }
};

async function testTenantConfiguration() {
    try {
        console.log('🧪 Testing tenant configuration system...');

        // 1. Check if configuration tables exist
        console.log('\n1. Checking configuration tables...');
        const tables = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'tenant_configuration%'
            ORDER BY table_name
        `);
        
        console.log('✅ Configuration tables found:');
        tables.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });

        // 2. Check if functions exist
        console.log('\n2. Checking configuration functions...');
        const functions = await db.query(`
            SELECT routine_name 
            FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name LIKE '%tenant_configuration%'
            ORDER BY routine_name
        `);
        
        console.log('✅ Configuration functions found:');
        functions.rows.forEach(row => {
            console.log(`   - ${row.routine_name}`);
        });

        // 3. Check templates
        console.log('\n3. Checking configuration templates...');
        const templates = await db.query(`
            SELECT name, is_default, target_tenant_types
            FROM tenant_configuration_templates
            ORDER BY is_default DESC, name
        `);
        
        console.log('✅ Configuration templates:');
        templates.rows.forEach(row => {
            console.log(`   - ${row.name} (default: ${row.is_default}, types: ${row.target_tenant_types || 'all'})`);
        });

        // 4. Check inheritance rules
        console.log('\n4. Checking inheritance rules...');
        const rules = await db.query(`
            SELECT category, key, inheritance_type, merge_strategy
            FROM tenant_configuration_inheritance_rules
            ORDER BY category, key
        `);
        
        console.log('✅ Inheritance rules:');
        rules.rows.forEach(row => {
            console.log(`   - ${row.category}.${row.key}: ${row.inheritance_type}${row.merge_strategy ? ` (${row.merge_strategy})` : ''}`);
        });

        // 5. Test configuration versioning for existing tenants
        console.log('\n5. Checking tenant configuration versions...');
        const versions = await db.query(`
            SELECT 
                t.name as tenant_name,
                tcv.version,
                tcv.is_active,
                tcv.description
            FROM tenant_configuration_versions tcv
            JOIN tenants t ON tcv.tenant_id = t.id
            ORDER BY t.name, tcv.version DESC
        `);
        
        console.log('✅ Configuration versions:');
        if (versions.rows.length > 0) {
            versions.rows.forEach(row => {
                console.log(`   - ${row.tenant_name}: v${row.version} ${row.is_active ? '(active)' : ''} - ${row.description}`);
            });
        } else {
            console.log('   - No versions found (this is normal if no tenants exist yet)');
        }

        // 6. Test creating a configuration version
        console.log('\n6. Testing configuration version creation...');
        
        // Get first tenant
        const tenants = await db.query('SELECT id, name FROM tenants LIMIT 1');
        
        if (tenants.rows.length > 0) {
            const tenant = tenants.rows[0];
            console.log(`   Testing with tenant: ${tenant.name}`);
            
            // Test configuration
            const testConfig = {
                features: {
                    inventory: true,
                    contracts: true,
                    deliveries: false,
                    reports: true,
                    mobile: true,
                    analytics: true
                },
                branding: {
                    primaryColor: '#ff5722',
                    secondaryColor: '#3f51b5'
                },
                limits: {
                    maxUsers: 150,
                    maxSchools: 75,
                    maxProducts: 1500
                }
            };
            
            // Create new version
            const versionResult = await db.query(`
                SELECT create_tenant_configuration_version($1, $2, $3, $4) as version
            `, [tenant.id, JSON.stringify(testConfig), 'Test configuration update', null]);
            
            const newVersion = versionResult.rows[0].version;
            console.log(`   ✅ Created configuration version ${newVersion}`);
            
            // Verify the configuration was saved
            const savedConfig = await db.query(`
                SELECT configurations
                FROM tenant_configuration_versions
                WHERE tenant_id = $1 AND version = $2
            `, [tenant.id, newVersion]);
            
            if (savedConfig.rows.length > 0) {
                console.log('   ✅ Configuration saved successfully');
                console.log('   📋 Sample configuration:');
                const config = savedConfig.rows[0].configurations;
                console.log(`      Features: ${Object.keys(config.features || {}).length} items`);
                console.log(`      Branding: ${Object.keys(config.branding || {}).length} items`);
                console.log(`      Limits: ${Object.keys(config.limits || {}).length} items`);
            }
        } else {
            console.log('   ⚠️  No tenants found to test with');
        }

        console.log('\n🎉 Tenant configuration system test completed successfully!');
        console.log('\n📋 Summary:');
        console.log(`   - Tables: ${tables.rows.length}`);
        console.log(`   - Functions: ${functions.rows.length}`);
        console.log(`   - Templates: ${templates.rows.length}`);
        console.log(`   - Inheritance rules: ${rules.rows.length}`);
        console.log(`   - Configuration versions: ${versions.rows.length}`);

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

testTenantConfiguration();