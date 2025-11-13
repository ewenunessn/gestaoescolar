const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function fixNeonTenantsTable() {
  const client = await neonPool.connect();
  
  try {
    console.log('🔧 Corrigindo tabela tenants no Neon...\n');

    // 1. Adicionar coluna domain
    console.log('➕ Adicionando coluna domain...');
    try {
      await client.query(`
        ALTER TABLE tenants 
        ADD COLUMN IF NOT EXISTS domain VARCHAR(255)
      `);
      console.log('✅ Coluna domain adicionada');
    } catch (e) {
      console.log('⚠️  Coluna domain já existe ou erro:', e.message);
    }

    // 2. Adicionar coluna settings
    console.log('➕ Adicionando coluna settings...');
    try {
      await client.query(`
        ALTER TABLE tenants 
        ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb
      `);
      console.log('✅ Coluna settings adicionada');
    } catch (e) {
      console.log('⚠️  Coluna settings já existe ou erro:', e.message);
    }

    // 3. Adicionar coluna limits
    console.log('➕ Adicionando coluna limits...');
    try {
      await client.query(`
        ALTER TABLE tenants 
        ADD COLUMN IF NOT EXISTS limits JSONB DEFAULT '{}'::jsonb
      `);
      console.log('✅ Coluna limits adicionada');
    } catch (e) {
      console.log('⚠️  Coluna limits já existe ou erro:', e.message);
    }

    // 4. Migrar dados de config para settings (se config existir)
    console.log('\n🔄 Migrando dados de config para settings...');
    await client.query(`
      UPDATE tenants 
      SET settings = COALESCE(config, '{}'::jsonb)
      WHERE settings IS NULL OR settings = '{}'::jsonb
    `);
    console.log('✅ Dados migrados');

    // 5. Verificar estrutura final
    console.log('\n📊 Verificando estrutura final...');
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'tenants'
      ORDER BY ordinal_position
    `);

    console.log('\nColunas da tabela tenants no Neon:');
    result.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await neonPool.end();
  }
}

fixNeonTenantsTable()
  .then(() => {
    console.log('\n✅ Correção concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Correção falhou:', error.message);
    process.exit(1);
  });
