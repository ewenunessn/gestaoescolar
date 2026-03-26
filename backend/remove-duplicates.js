const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Ler DATABASE_URL do .env
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');
let databaseUrl = null;

for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('DATABASE_URL=') && !trimmed.startsWith('#')) {
    databaseUrl = trimmed.replace('DATABASE_URL=', '').replace('&channel_binding=require', '');
    break;
  }
}

if (!databaseUrl) {
  console.error('❌ DATABASE_URL não encontrada no .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║     REMOÇÃO DE TABELAS DUPLICADAS E DE TESTE                   ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    console.log('🔌 Conectando ao banco de dados...');
    await client.query('SELECT NOW()');
    console.log('✅ Conectado\n');
    
    console.log('📊 Contando tabelas antes...');
    const beforeCount = await client.query(`
      SELECT COUNT(*) as total FROM pg_tables WHERE schemaname = 'public'
    `);
    console.log(`   Total: ${beforeCount.rows[0].total}\n`);
    
    console.log('🔄 Executando remoção...\n');
    const sqlPath = path.join(__dirname, 'migrations', 'remove-duplicate-test-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query(sql);
    
    console.log('✅ Remoção concluída!\n');
    
    console.log('📊 Contando tabelas depois...');
    const afterCount = await client.query(`
      SELECT COUNT(*) as total FROM pg_tables WHERE schemaname = 'public'
    `);
    console.log(`   Total: ${afterCount.rows[0].total}\n`);
    
    const removed = parseInt(beforeCount.rows[0].total) - parseInt(afterCount.rows[0].total);
    console.log(`✅ ${removed} tabelas removidas!\n`);
    
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ CONCLUÍDO!                               ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
