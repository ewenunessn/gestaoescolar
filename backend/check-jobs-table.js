const { Pool } = require('pg');
require('dotenv').config();

async function checkJobsTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔍 Verificando tabela jobs...\n');
    
    // Verificar se a tabela existe
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'jobs'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('❌ Tabela jobs não existe!');
      return;
    }
    
    console.log('✅ Tabela jobs existe!');
    
    // Verificar estrutura
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'jobs'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Colunas da tabela:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Contar registros
    const count = await pool.query('SELECT COUNT(*) FROM jobs');
    console.log(`\n📊 Total de registros: ${count.rows[0].count}`);
    
    // Mostrar últimos 5 jobs
    const recent = await pool.query(`
      SELECT id, tipo, status, progresso, created_at 
      FROM jobs 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    if (recent.rows.length > 0) {
      console.log('\n📝 Últimos jobs:');
      recent.rows.forEach(job => {
        console.log(`  - ID ${job.id}: ${job.tipo} (${job.status}) - ${job.progresso}% - ${job.created_at}`);
      });
    } else {
      console.log('\n📝 Nenhum job encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkJobsTable();
