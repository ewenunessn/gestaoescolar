const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: connectionString && connectionString.includes('neon') ? { rejectUnauthorized: false } : false
});

async function verificarEntregasAntigas() {
  try {
    console.log('🔍 Verificando entregas antigas (guia_produto_escola)...\n');

    // Contar entregas confirmadas na tabela antiga
    const confirmadas = await pool.query(`
      SELECT COUNT(*) as total 
      FROM guia_produto_escola 
      WHERE entrega_confirmada = true
    `);
    console.log(`✅ Entregas confirmadas (formato antigo): ${confirmadas.rows[0].total}`);

    // Contar entregas na nova tabela
    const novaTabela = await pool.query(`
      SELECT COUNT(*) as total FROM historico_entregas
    `);
    console.log(`📦 Entregas na nova tabela (historico_entregas): ${novaTabela.rows[0].total}`);

    // Mostrar últimas 10 entregas confirmadas do formato antigo
    const ultimasAntigas = await pool.query(`
      SELECT 
        gpe.id,
        gpe.data_entrega,
        gpe.quantidade_entregue,
        gpe.nome_quem_entregou,
        gpe.nome_quem_recebeu,
        p.nome as produto_nome,
        e.nome as escola_nome,
        CASE 
          WHEN gpe.assinatura_base64 IS NOT NULL AND gpe.assinatura_base64 != '' 
          THEN 'SIM (' || LENGTH(gpe.assinatura_base64) || ' chars)'
          ELSE 'NÃO'
        END as tem_assinatura
      FROM guia_produto_escola gpe
      INNER JOIN produtos p ON gpe.produto_id = p.id
      INNER JOIN escolas e ON gpe.escola_id = e.id
      WHERE gpe.entrega_confirmada = true
      ORDER BY gpe.data_entrega DESC NULLS LAST
      LIMIT 10
    `);

    console.log('\n📋 Últimas 10 entregas (formato antigo):');
    console.log('─'.repeat(100));
    ultimasAntigas.rows.forEach(row => {
      console.log(`ID: ${row.id} | ${row.data_entrega ? new Date(row.data_entrega).toLocaleString('pt-BR') : 'Sem data'}`);
      console.log(`   Produto: ${row.produto_nome}`);
      console.log(`   Escola: ${row.escola_nome}`);
      console.log(`   Quantidade: ${row.quantidade_entregue || 'N/A'}`);
      console.log(`   Entregador: ${row.nome_quem_entregou || 'N/A'}`);
      console.log(`   Recebedor: ${row.nome_quem_recebeu || 'N/A'}`);
      console.log(`   Assinatura: ${row.tem_assinatura}`);
      console.log('─'.repeat(100));
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

verificarEntregasAntigas();
