/**
 * Script para sincronizar com Neon usando a URL diretamente
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// URL do Neon (descomente a linha abaixo e cole sua URL)
const NEON_URL = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

if (!NEON_URL || NEON_URL.includes('YOUR_NEON_URL')) {
  console.error('❌ Configure a URL do Neon no arquivo sync-neon-now.js');
  console.log('\nEdite a linha:');
  console.log('const NEON_URL = "postgresql://user:pass@host/db?sslmode=require";');
  process.exit(1);
}

const migrations = [
  '014_create_institutions_hierarchy.sql',
  '015_create_system_admins.sql',
  '016_add_institution_plans.sql'
];

async function runMigrations() {
  const client = new Client({
    connectionString: NEON_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Conectando ao Neon...');
    await client.connect();
    console.log('✅ Conectado!\n');

    for (const migration of migrations) {
      const filePath = path.join(__dirname, 'migrations', migration);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Migration não encontrada: ${migration}`);
        continue;
      }
      
      const sql = fs.readFileSync(filePath, 'utf8');
      
      console.log(`📄 Executando: ${migration}`);
      console.log(`   Tamanho: ${(sql.length / 1024).toFixed(2)} KB`);
      
      try {
        await client.query(sql);
        console.log(`✅ ${migration} - OK\n`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  ${migration} - Já existe (ignorando)\n`);
        } else {
          console.error(`❌ ${migration} - ERRO:`, error.message, '\n');
        }
      }
    }

    console.log('✅ Migrations concluídas!');
    
    // Verificar tabelas criadas
    console.log('\n🔍 Verificando tabelas criadas...\n');
    
    const tables = [
      'institutions',
      'institution_users',
      'institution_contracts',
      'institution_audit_log',
      'system_admins',
      'system_admin_audit_log',
      'institution_plans'
    ];
    
    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      
      const exists = result.rows[0].exists;
      console.log(`${exists ? '✅' : '❌'} ${table.padEnd(30)} ${exists ? 'EXISTS' : 'MISSING'}`);
    }
    
    // Verificar planos
    console.log('\n📋 Verificando planos criados...\n');
    const plansResult = await client.query('SELECT id, name, max_schools, max_users FROM institution_plans ORDER BY id');
    
    if (plansResult.rows.length > 0) {
      console.log('Planos encontrados:');
      plansResult.rows.forEach(plan => {
        console.log(`  ${plan.id}. ${plan.name} - ${plan.max_schools} escolas, ${plan.max_users} usuários`);
      });
    } else {
      console.log('⚠️  Nenhum plano encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n👋 Conexão encerrada.');
  }
}

runMigrations();
