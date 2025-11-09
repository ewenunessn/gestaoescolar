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
    console.log('🚀 Iniciando migração de hierarquia de instituições...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '014_create_institutions_hierarchy.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Executando migration: 014_create_institutions_hierarchy.sql');
    await client.query(migrationSQL);
    console.log('✅ Migration executada com sucesso!\n');

    // Verify tables were created
    console.log('🔍 Verificando tabelas criadas...');
    
    const tables = ['institutions', 'institution_users', 'institution_contracts', 'institution_audit_log'];
    
    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      
      if (result.rows[0].exists) {
        console.log(`  ✅ Tabela ${table} criada`);
      } else {
        console.log(`  ❌ Tabela ${table} não encontrada`);
      }
    }

    // Verify columns were added
    console.log('\n🔍 Verificando colunas adicionadas...');
    
    const tenantColumn = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'tenants' 
        AND column_name = 'institution_id'
      )
    `);
    
    if (tenantColumn.rows[0].exists) {
      console.log('  ✅ Coluna institution_id adicionada em tenants');
    }

    const userColumn = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'usuarios' 
        AND column_name = 'institution_id'
      )
    `);
    
    if (userColumn.rows[0].exists) {
      console.log('  ✅ Coluna institution_id adicionada em usuarios');
    }

    // Check default institution
    console.log('\n🔍 Verificando instituição padrão...');
    const defaultInstitution = await client.query(`
      SELECT * FROM institutions 
      WHERE id = '00000000-0000-0000-0000-000000000001'
    `);
    
    if (defaultInstitution.rows.length > 0) {
      console.log('  ✅ Instituição padrão criada:');
      console.log(`     Nome: ${defaultInstitution.rows[0].name}`);
      console.log(`     Slug: ${defaultInstitution.rows[0].slug}`);
      console.log(`     Status: ${defaultInstitution.rows[0].status}`);
    }

    // Statistics
    console.log('\n📊 Estatísticas:');
    
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM institutions) as total_institutions,
        (SELECT COUNT(*) FROM tenants) as total_tenants,
        (SELECT COUNT(*) FROM usuarios) as total_users,
        (SELECT COUNT(*) FROM institution_users) as total_institution_users
    `);
    
    console.log(`  Instituições: ${stats.rows[0].total_institutions}`);
    console.log(`  Tenants: ${stats.rows[0].total_tenants}`);
    console.log(`  Usuários: ${stats.rows[0].total_users}`);
    console.log(`  Vínculos instituição-usuário: ${stats.rows[0].total_institution_users}`);

    console.log('\n✅ Migração concluída com sucesso!');
    console.log('\n📝 Próximos passos:');
    console.log('  1. Adicionar as rotas no seu app.ts/index.ts:');
    console.log('     app.use(\'/api/institutions\', institutionRoutes);');
    console.log('     app.use(\'/api/provisioning\', provisioningRoutes);');
    console.log('  2. Testar o endpoint de provisionamento completo');
    console.log('  3. Criar interface de administração para gerenciar instituições');

  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
