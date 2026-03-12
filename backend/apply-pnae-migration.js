// Script para aplicar migration PNAE
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false
});

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Iniciando migration PNAE...\n');
    
    // Ler arquivo de migration
    const migrationPath = path.join(__dirname, 'migrations', '20260312_add_pnae_compliance.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Executar migration em uma transação
    await client.query('BEGIN');
    
    console.log('📝 Executando comandos SQL...');
    await client.query(migrationSQL);
    
    await client.query('COMMIT');
    
    console.log('\n✅ Migration aplicada com sucesso!');
    console.log('\n📊 Verificando estrutura criada...\n');
    
    // Verificar tabelas criadas
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('pnae_per_capita', 'pnae_relatorios')
      ORDER BY table_name
    `);
    
    console.log('Tabelas PNAE criadas:');
    tablesResult.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    // Verificar views criadas
    const viewsResult = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'vw_pnae%'
      ORDER BY table_name
    `);
    
    console.log('\nViews PNAE criadas:');
    viewsResult.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    // Verificar colunas adicionadas em fornecedores
    const fornecedorColsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'fornecedores' 
      AND column_name IN ('tipo_fornecedor', 'dap_caf', 'data_validade_dap')
      ORDER BY column_name
    `);
    
    console.log('\nColunas adicionadas em fornecedores:');
    fornecedorColsResult.rows.forEach(row => {
      console.log(`  ✓ ${row.column_name}`);
    });
    
    // Verificar colunas adicionadas em pedidos
    const pedidosColsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'pedidos' 
      AND column_name IN ('modalidade_id', 'origem_recurso', 'percentual_agricultura_familiar')
      ORDER BY column_name
    `);
    
    console.log('\nColunas adicionadas em pedidos:');
    pedidosColsResult.rows.forEach(row => {
      console.log(`  ✓ ${row.column_name}`);
    });
    
    // Verificar valores per capita inseridos
    const perCapitaResult = await client.query(`
      SELECT COUNT(*) as total FROM pnae_per_capita
    `);
    
    console.log(`\n📈 Valores per capita configurados: ${perCapitaResult.rows[0].total}`);
    
    console.log('\n✅ Sistema pronto para conformidade PNAE!');
    console.log('⚠️  IMPORTANTE: Funcionalidades existentes não foram alteradas.');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Erro ao aplicar migration:', error.message);
    console.error('\nDetalhes:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration();
