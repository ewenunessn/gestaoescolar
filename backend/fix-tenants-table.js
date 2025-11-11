require('dotenv').config();
const { Pool } = require('pg');

// Usar Neon em produção
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function fixTenantsTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando estrutura da tabela tenants...\n');

    // Verificar se a coluna name existe
    const checkColumn = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tenants'
      ORDER BY ordinal_position
    `);

    console.log('📊 Colunas atuais da tabela tenants:');
    checkColumn.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    console.log('');

    const hasNameColumn = checkColumn.rows.some(col => col.column_name === 'name');

    if (!hasNameColumn) {
      console.log('⚠️  Coluna "name" não encontrada. Adicionando...\n');
      
      await client.query(`
        ALTER TABLE tenants 
        ADD COLUMN IF NOT EXISTS name VARCHAR(255) NOT NULL DEFAULT 'Tenant';
      `);

      console.log('✅ Coluna "name" adicionada com sucesso!\n');
    } else {
      console.log('✅ Coluna "name" já existe!\n');
    }

    // Verificar estrutura final
    const finalCheck = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'tenants'
      ORDER BY ordinal_position
    `);

    console.log('📊 Estrutura final da tabela tenants:');
    finalCheck.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixTenantsTable()
  .then(() => {
    console.log('\n✅ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falhou:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  });
