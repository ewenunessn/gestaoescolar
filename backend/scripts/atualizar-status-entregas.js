/**
 * Script para atualizar o status de todos os itens da guia baseado nas entregas realizadas
 * 
 * Este script deve ser executado uma vez para corrigir o status de itens que já têm entregas
 * mas ainda estão com status 'pendente'.
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function atualizarStatusEntregas() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando atualização de status de entregas...\n');

    // Atualizar status de todos os itens baseado nas entregas
    const result = await client.query(`
      UPDATE guia_produto_escola
      SET 
        status = CASE 
          WHEN (
            SELECT COALESCE(SUM(quantidade_entregue), 0) 
            FROM historico_entregas 
            WHERE guia_produto_escola_id = guia_produto_escola.id
          ) >= quantidade THEN 'entregue'
          WHEN (
            SELECT COALESCE(SUM(quantidade_entregue), 0) 
            FROM historico_entregas 
            WHERE guia_produto_escola_id = guia_produto_escola.id
          ) > 0 THEN 'parcial'
          ELSE status
        END,
        updated_at = NOW()
      WHERE EXISTS (
        SELECT 1 
        FROM historico_entregas 
        WHERE guia_produto_escola_id = guia_produto_escola.id
      )
      RETURNING id, status, quantidade, quantidade_total_entregue
    `);

    console.log(`✅ ${result.rowCount} itens atualizados\n`);

    if (result.rowCount > 0) {
      console.log('📊 Resumo das atualizações:');
      
      // Contar por status
      const statusCount = result.rows.reduce((acc, row) => {
        acc[row.status] = (acc[row.status] || 0) + 1;
        return acc;
      }, {});

      Object.entries(statusCount).forEach(([status, count]) => {
        console.log(`   ${status}: ${count} itens`);
      });

      console.log('\n📋 Exemplos de itens atualizados:');
      result.rows.slice(0, 5).forEach(row => {
        console.log(`   ID ${row.id}: ${row.quantidade_total_entregue}/${row.quantidade} → ${row.status}`);
      });
    }

    console.log('\n✅ Atualização concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao atualizar status:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar o script
atualizarStatusEntregas()
  .then(() => {
    console.log('\n🎉 Script finalizado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Erro fatal:', error);
    process.exit(1);
  });
