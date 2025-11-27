const { Pool } = require('pg');

// Usar a mesma configuração do backend
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar';

const pool = new Pool({
  connectionString,
  ssl: false
});

async function addColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Adicionando coluna default_tenant_id...');
    
    // Verificar se a coluna já existe
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'institutions' 
      AND column_name = 'default_tenant_id'
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('✅ Coluna default_tenant_id já existe!');
    } else {
      // Adicionar coluna
      await client.query(`
        ALTER TABLE institutions 
        ADD COLUMN default_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL
      `);
      
      console.log('✅ Coluna default_tenant_id adicionada com sucesso!');
      
      // Adicionar índice
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_institutions_default_tenant 
        ON institutions(default_tenant_id)
      `);
      
      console.log('✅ Índice criado com sucesso!');
    }
    
    // Listar instituições
    const institutions = await client.query(`
      SELECT id, name, default_tenant_id 
      FROM institutions 
      ORDER BY name
    `);
    
    console.log('\n📋 Instituições:');
    institutions.rows.forEach(inst => {
      console.log(`  - ${inst.name}: default_tenant_id = ${inst.default_tenant_id || 'null'}`);
    });
    
    // Listar tenants por instituição
    console.log('\n📋 Tenants por instituição:');
    const tenants = await client.query(`
      SELECT 
        i.name as institution_name,
        t.id as tenant_id,
        t.name as tenant_name,
        t.slug as tenant_slug
      FROM institutions i
      LEFT JOIN tenants t ON t.institution_id = i.id
      WHERE t.status = 'active'
      ORDER BY i.name, t.name
    `);
    
    let currentInst = null;
    tenants.rows.forEach(row => {
      if (row.institution_name !== currentInst) {
        console.log(`\n  ${row.institution_name}:`);
        currentInst = row.institution_name;
      }
      console.log(`    - ${row.tenant_name} (${row.tenant_slug}) [${row.tenant_id}]`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addColumn().catch(console.error);
