require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function applyToNeon() {
  try {
    console.log('🔄 Atualizando view no Neon...\n');
    
    const sql = fs.readFileSync('./migrations/20260312_update_pnae_view_competencia.sql', 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ View atualizada no Neon com sucesso!\n');
    
    // Testar a view
    const result = await pool.query(`
      SELECT 
        pedido_id,
        competencia_mes_ano,
        data_pedido,
        valor_itens,
        valor_agricultura_familiar
      FROM vw_pnae_agricultura_familiar
      LIMIT 5
    `);
    
    console.log('📊 Dados de exemplo da view no Neon:\n');
    result.rows.forEach(row => {
      console.log(`  Pedido ${row.pedido_id}: Competência ${row.competencia_mes_ano}, Valor AF: R$ ${parseFloat(row.valor_agricultura_familiar || 0).toFixed(2)}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar view no Neon:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyToNeon();
