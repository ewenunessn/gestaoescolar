const { Pool } = require('pg');

// Configurações dos bancos
const LOCAL_DB = 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar';
const NEON_DB = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function addColumnToDatabase(connectionString, dbName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔧 Processando: ${dbName}`);
  console.log('='.repeat(60));
  
  const isNeon = connectionString.includes('neon.tech');
  const pool = new Pool({
    connectionString,
    ssl: isNeon ? { rejectUnauthorized: false } : false
  });

  const client = await pool.connect();
  
  try {
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
      console.log('🚀 Adicionando coluna default_tenant_id...');
      
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
    
    console.log(`\n📋 Instituições (${institutions.rows.length}):`);
    institutions.rows.forEach(inst => {
      console.log(`  - ${inst.name}`);
      console.log(`    default_tenant_id: ${inst.default_tenant_id || 'null'}`);
    });
    
    // Listar tenants por instituição
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
    
    if (tenants.rows.length > 0) {
      console.log(`\n📋 Tenants ativos por instituição:`);
      let currentInst = null;
      tenants.rows.forEach(row => {
        if (row.institution_name !== currentInst) {
          console.log(`\n  ${row.institution_name}:`);
          currentInst = row.institution_name;
        }
        console.log(`    - ${row.tenant_name} (${row.tenant_slug})`);
        console.log(`      ID: ${row.tenant_id}`);
      });
    }
    
    console.log(`\n✅ ${dbName} processado com sucesso!`);
    
  } catch (error) {
    console.error(`❌ Erro em ${dbName}:`, error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  console.log('🚀 Iniciando adição de coluna default_tenant_id em ambos os bancos...\n');
  
  try {
    // Processar banco local
    await addColumnToDatabase(LOCAL_DB, 'BANCO LOCAL');
    
    // Processar Neon
    await addColumnToDatabase(NEON_DB, 'NEON (Produção)');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ PROCESSO CONCLUÍDO COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('\n📝 Próximos passos:');
    console.log('  1. Reinicie o backend para aplicar as mudanças');
    console.log('  2. Acesse o Admin Panel');
    console.log('  3. Entre nos detalhes de uma instituição');
    console.log('  4. Configure o tenant padrão no dropdown');
    console.log('  5. Faça login com um usuário dessa instituição');
    console.log('  6. O tenant padrão será usado automaticamente!\n');
    
  } catch (error) {
    console.error('\n❌ Erro durante o processo:', error);
    process.exit(1);
  }
}

main();
