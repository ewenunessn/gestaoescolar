const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL ou POSTGRES_URL não configurado');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function addSubdomainColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando coluna "subdomain" na tabela tenants...\n');

    // Verificar se a coluna subdomain existe
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'subdomain'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('✅ Coluna "subdomain" já existe!\n');
    } else {
      console.log('⚠️  Coluna "subdomain" não encontrada. Adicionando...\n');
      
      await client.query(`
        ALTER TABLE tenants 
        ADD COLUMN subdomain VARCHAR(50) UNIQUE;
      `);

      console.log('✅ Coluna "subdomain" adicionada com sucesso!\n');
    }

    // Verificar estrutura final
    const finalCheck = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'tenants'
      ORDER BY ordinal_position
    `);

    console.log('📊 Estrutura final da tabela tenants:');
    finalCheck.rows.forEach(col => {
      const nullable = col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL';
      console.log(`   - ${col.column_name}: ${col.data_type} ${nullable}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addSubdomainColumn()
  .then(() => {
    console.log('\n✅ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falhou:', error.message);
    process.exit(1);
  });
