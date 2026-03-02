const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function executar() {
  try {
    const sql = fs.readFileSync('./scripts/criar-comprovante-simples.sql', 'utf8');
    await pool.query(sql);
    console.log('✅ SQL executado com sucesso!');
    
    // Verificar
    const result = await pool.query('SELECT * FROM comprovantes_entrega ORDER BY id DESC LIMIT 1');
    if (result.rows.length > 0) {
      console.log('\n📋 Comprovante criado:');
      console.log(`   Número: ${result.rows[0].numero_comprovante}`);
      console.log(`   Escola ID: ${result.rows[0].escola_id}`);
      console.log(`   Entregador: ${result.rows[0].nome_quem_entregou}`);
      console.log(`   Recebedor: ${result.rows[0].nome_quem_recebeu}`);
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

executar();
