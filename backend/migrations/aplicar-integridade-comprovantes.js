const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Use DATABASE_URL if available, otherwise construct from individual vars
const connectionConfig = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : false
    }
  : {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'alimentacao_escolar',
      password: process.env.DB_PASSWORD || 'admin123',
      port: parseInt(process.env.DB_PORT || '5432'),
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    };

const pool = new Pool(connectionConfig);

async function aplicarMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Aplicando migration de integridade de comprovantes...\n');
    
    const sqlPath = path.join(__dirname, '20260330_comprovante_data_integrity.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    
    console.log('✅ Migration aplicada com sucesso!\n');
    
    // Verificar estrutura
    console.log('📊 Verificando estrutura...\n');
    
    const colunas = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'comprovante_itens'
      AND column_name IN ('guia_demanda_id', 'mes_referencia', 'ano_referencia', 'data_entrega_original')
      ORDER BY column_name;
    `);
    
    console.log('Colunas adicionadas em comprovante_itens:');
    colunas.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    const tabelas = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('comprovante_cancelamentos')
      ORDER BY table_name;
    `);
    
    console.log('\nTabelas criadas:');
    tabelas.rows.forEach(t => {
      console.log(`  - ${t.table_name}`);
    });
    
    const funcoes = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name IN ('popular_dados_comprovante_item', 'cancelar_item_entrega')
      ORDER BY routine_name;
    `);
    
    console.log('\nFunções criadas:');
    funcoes.rows.forEach(f => {
      console.log(`  - ${f.routine_name}()`);
    });
    
    console.log('\n✅ Estrutura verificada com sucesso!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao aplicar migration:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

aplicarMigration().catch(console.error);
