const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco Neon (produção)
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigrationNeon() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Iniciando migration de validade simples no Neon...');
    
    // Ler o arquivo SQL
    const migrationPath = path.join(__dirname, 'migrations', 'add-validade-simples.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Executar a migration
    await client.query(migrationSQL);
    
    console.log('✅ Migration de validade simples executada com sucesso no Neon!');
    
    // Verificar se as tabelas foram criadas
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('estoque_escolas', 'historico_estoque')
    `);
    
    console.log('📋 Tabelas encontradas:', result.rows.map(r => r.table_name));
    
    // Verificar colunas da tabela estoque_escolas
    const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'estoque_escolas'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Colunas da tabela estoque_escolas:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Verificar colunas da tabela historico_estoque
    const histColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'historico_estoque'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Colunas da tabela historico_estoque:');
    histColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Erro na migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runMigrationNeon()
    .then(() => {
      console.log('🎉 Migration no Neon concluída!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Falha na migration no Neon:', error);
      process.exit(1);
    });
}

module.exports = { runMigrationNeon };