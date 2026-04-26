const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  connectionString: process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  await client.connect();
  console.log('✅ Conectado ao Neon\n');

  try {
    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, '20260315_add_marca_peso_contrato_produtos.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Executando migration...');
    await client.query(sql);
    console.log('✅ Migration executada com sucesso!');

    // Verificar se as colunas foram criadas
    const columns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'contrato_produtos'
      AND column_name IN ('marca', 'peso')
      ORDER BY column_name
    `);
    
    console.log('\n📋 Colunas adicionadas:');
    columns.rows.forEach(col => {
      console.log(`  ✅ ${col.column_name}: ${col.data_type}`);
    });

  } catch (error) {
    console.error('❌ Erro ao executar migration:', error);
    throw error;
  } finally {
    await client.end();
    console.log('\n🔌 Conexão fechada');
  }
}

runMigration()
  .then(() => {
    console.log('✅ Processo concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Processo falhou');
    process.exit(1);
  });
