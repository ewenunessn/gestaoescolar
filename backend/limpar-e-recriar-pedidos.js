const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alimentacao_escolar',
  password: process.env.DB_PASSWORD || 'admin123',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function limparERecriar() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Limpando tabelas antigas...');
    
    await client.query('BEGIN');
    
    // Remover tabelas antigas (se existirem)
    await client.query('DROP TABLE IF EXISTS pedido_itens CASCADE');
    await client.query('DROP TABLE IF EXISTS pedidos CASCADE');
    
    console.log('✅ Tabelas antigas removidas');
    
    // Ler e executar o SQL de criação
    const sqlPath = path.join(__dirname, 'src', 'migrations', 'create_pedidos_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('🔄 Criando tabelas novas...');
    await client.query(sql);
    
    await client.query('COMMIT');
    
    console.log('✅ Tabelas criadas com sucesso!');
    
    // Verificar tabelas criadas
    const result = await client.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('pedidos', 'pedido_itens')
      ORDER BY table_name, ordinal_position
    `);
    
    console.log('📊 Estrutura das tabelas:');
    let currentTable = '';
    result.rows.forEach(row => {
      if (row.table_name !== currentTable) {
        currentTable = row.table_name;
        console.log(`\n   ${row.table_name}:`);
      }
      console.log(`     - ${row.column_name} (${row.data_type})`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

limparERecriar()
  .then(() => {
    console.log('\n✅ Processo concluído com sucesso!');
    console.log('🚀 Agora você pode testar o sistema de pedidos');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Falha no processo:', error);
    process.exit(1);
  });