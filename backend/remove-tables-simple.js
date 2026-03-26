const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Ler DATABASE_URL do .env
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

// Pegar apenas linhas não comentadas
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

console.log('🔗 Conectando ao banco:', databaseUrl.substring(0, 50) + '...\n');

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║     REMOÇÃO DE TABELAS NÃO UTILIZADAS                          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    // 1. Verificar conexão
    console.log('🔌 Verificando conexão com banco de dados...');
    await client.query('SELECT NOW()');
    console.log('✅ Conectado ao banco de dados\n');
    
    // 2. Contar tabelas antes
    console.log('📊 Contando tabelas antes da remoção...');
    const beforeCount = await client.query(`
      SELECT COUNT(*) as total
      FROM pg_tables
      WHERE schemaname = 'public'
    `);
    console.log(`   Total de tabelas: ${beforeCount.rows[0].total}\n`);
    
    // 3. Ler e executar SQL
    console.log('🔄 Executando script de remoção...\n');
    const sqlPath = path.join(__dirname, 'migrations', 'remove-unused-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query(sql);
    
    console.log('✅ Script executado com sucesso!\n');
    
    // 4. Contar tabelas depois
    console.log('📊 Contando tabelas após remoção...');
    const afterCount = await client.query(`
      SELECT COUNT(*) as total
      FROM pg_tables
      WHERE schemaname = 'public'
    `);
    console.log(`   Total de tabelas: ${afterCount.rows[0].total}\n`);
    
    const removed = parseInt(beforeCount.rows[0].total) - parseInt(afterCount.rows[0].total);
    console.log(`✅ ${removed} tabelas removidas com sucesso!\n`);
    
    // 5. Listar tabelas restantes
    console.log('📋 Tabelas restantes no banco:');
    const remainingTables = await client.query(`
      SELECT 
        tablename,
        pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    remainingTables.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.tablename} (${row.size})`);
    });
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ MIGRAÇÃO CONCLUÍDA!                      ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('\n❌ ERRO durante a migração:', error.message);
    console.error('\n⚠️  A transação foi revertida. Nenhuma alteração foi feita.\n');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar migração
runMigration().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
