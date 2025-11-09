/**
 * Script simplificado para executar migrations no Neon
 * Executa apenas as migrations de instituições, system admins e planos
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Usar DATABASE_URL do .env (Neon)
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL não configurado no .env');
  process.exit(1);
}

const migrations = [
  '014_create_institutions_hierarchy.sql',
  '015_create_system_admins.sql',
  '016_add_institution_plans.sql'
];

async function runMigrations() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Conectando ao Neon...');
    await client.connect();
    console.log('✅ Conectado!\n');

    for (const migration of migrations) {
      const filePath = path.join(__dirname, 'migrations', migration);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      console.log(`📄 Executando: ${migration}`);
      
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
    
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
