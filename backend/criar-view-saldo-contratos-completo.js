require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function criarViewLocal() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔗 Conectando ao banco LOCAL...\n');
    const client = await pool.connect();
    console.log('✅ Conectado!\n');

    const sqlPath = path.join(__dirname, 'fix_view_saldo_contratos.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Criando view view_saldo_contratos_itens...');
    await client.query(sql);
    console.log('✅ View criada com sucesso no banco LOCAL!\n');

    // Testar a view
    const result = await client.query('SELECT COUNT(*) as total FROM view_saldo_contratos_itens');
    console.log(`📊 Total de registros: ${result.rows[0].total}\n`);

    client.release();
  } catch (error) {
    console.error('❌ Erro no banco LOCAL:', error.message);
  } finally {
    await pool.end();
  }
}

async function criarViewNeon() {
  require('dotenv').config({ path: '.env.production' });
  
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔗 Conectando ao banco NEON (Produção)...\n');
    const client = await pool.connect();
    console.log('✅ Conectado!\n');

    const sqlPath = path.join(__dirname, 'fix_view_saldo_contratos.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Criando view view_saldo_contratos_itens...');
    await client.query(sql);
    console.log('✅ View criada com sucesso no banco NEON!\n');

    // Testar a view
    const result = await client.query('SELECT COUNT(*) as total FROM view_saldo_contratos_itens');
    console.log(`📊 Total de registros: ${result.rows[0].total}\n`);

    client.release();
  } catch (error) {
    console.error('❌ Erro no banco NEON:', error.message);
  } finally {
    await pool.end();
  }
}

async function executar() {
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('  🔧 CRIANDO VIEW view_saldo_contratos_itens\n');
  console.log('═══════════════════════════════════════════════════════\n');
  
  await criarViewLocal();
  console.log('───────────────────────────────────────────────────────\n');
  await criarViewNeon();
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('  ✅ PROCESSO CONCLUÍDO!');
  console.log('═══════════════════════════════════════════════════════\n');
  
  process.exit(0);
}

executar();
