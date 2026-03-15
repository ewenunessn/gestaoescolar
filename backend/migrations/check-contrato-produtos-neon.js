const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  await client.connect();
  console.log('✅ Conectado ao Neon\n');

  // Verificar estrutura da tabela contrato_produtos
  const columns = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'contrato_produtos'
    ORDER BY ordinal_position
  `);
  
  console.log('📊 Estrutura da tabela contrato_produtos:');
  columns.rows.forEach(col => {
    console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
  });

  // Verificar se a coluna marca existe
  const temMarca = columns.rows.some(col => col.column_name === 'marca');
  console.log(`\n${temMarca ? '✅' : '❌'} Coluna 'marca' ${temMarca ? 'existe' : 'NÃO existe'}`);

  await client.end();
}

check().catch(e => { console.error('❌ Erro:', e.message); client.end(); });
