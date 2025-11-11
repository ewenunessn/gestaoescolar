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

async function renameColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Renomeando coluna "nome" para "name" na tabela tenants...\n');

    // Verificar se a coluna nome existe
    const checkNome = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'nome'
    `);

    if (checkNome.rows.length === 0) {
      console.log('⚠️  Coluna "nome" não encontrada. Verificando se "name" já existe...');
      
      const checkName = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'tenants' AND column_name = 'name'
      `);

      if (checkName.rows.length > 0) {
        console.log('✅ Coluna "name" já existe!\n');
      } else {
        console.log('❌ Nenhuma das colunas encontrada.\n');
      }
      return;
    }

    console.log('✅ Coluna "nome" encontrada. Renomeando...\n');

    // Renomear a coluna
    await client.query(`
      ALTER TABLE tenants 
      RENAME COLUMN nome TO name;
    `);

    console.log('✅ Coluna renomeada com sucesso!\n');

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

renameColumn()
  .then(() => {
    console.log('\n✅ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falhou:', error.message);
    process.exit(1);
  });
