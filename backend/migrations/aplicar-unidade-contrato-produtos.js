/**
 * Aplica a migration que adiciona unidade, marca e peso em contrato_produtos
 * Uso: node backend/migrations/aplicar-unidade-contrato-produtos.js
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const sql = fs.readFileSync(
    path.join(__dirname, '20260323_add_unidade_to_contrato_produtos.sql'),
    'utf8'
  );

  console.log('🚀 Aplicando migration: unidade/marca/peso em contrato_produtos...');
  try {
    await pool.query(sql);
    console.log('✅ Migration aplicada com sucesso!');

    // Verificar resultado
    const check = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'contrato_produtos' 
        AND column_name IN ('unidade', 'marca', 'peso')
      ORDER BY column_name
    `);
    console.log('📋 Colunas em contrato_produtos:', check.rows);

    const counts = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(unidade) as com_unidade,
        COUNT(marca) as com_marca,
        COUNT(peso) as com_peso
      FROM contrato_produtos
    `);
    console.log('📊 Estatísticas:', counts.rows[0]);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
