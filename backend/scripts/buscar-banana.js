const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: connectionString && connectionString.includes('neon') ? { rejectUnauthorized: false } : false
});

async function buscarBanana() {
  try {
    console.log('🔍 Buscando entregas de Banana...\n');

    // Buscar na tabela historico_entregas
    const historicoResult = await pool.query(`
      SELECT 
        he.*,
        p.nome as produto_nome,
        e.nome as escola_nome
      FROM historico_entregas he
      INNER JOIN guia_produto_escola gpe ON he.guia_produto_escola_id = gpe.id
      INNER JOIN produtos p ON gpe.produto_id = p.id
      INNER JOIN escolas e ON gpe.escola_id = e.id
      WHERE LOWER(p.nome) LIKE '%banana%'
      ORDER BY he.created_at DESC
    `);

    console.log(`📦 Entregas de Banana no histórico: ${historicoResult.rows.length}`);
    
    if (historicoResult.rows.length > 0) {
      console.log('\n📋 Detalhes:');
      historicoResult.rows.forEach(row => {
        console.log('─'.repeat(100));
        console.log(`ID: ${row.id}`);
        console.log(`Produto: ${row.produto_nome}`);
        console.log(`Escola: ${row.escola_nome}`);
        console.log(`Quantidade: ${row.quantidade_entregue}`);
        console.log(`Data entrega: ${new Date(row.data_entrega).toLocaleString('pt-BR')}`);
        console.log(`Entregador: ${row.nome_quem_entregou}`);
        console.log(`Recebedor: ${row.nome_quem_recebeu}`);
        console.log(`Observação: ${row.observacao || 'N/A'}`);
        console.log(`Assinatura: ${row.assinatura_base64 ? `SIM (${row.assinatura_base64.length} chars)` : 'NÃO'}`);
        console.log(`Criado em: ${new Date(row.created_at).toLocaleString('pt-BR')}`);
      });
    }

    // Buscar itens de Banana na guia
    const itensResult = await pool.query(`
      SELECT 
        gpe.*,
        p.nome as produto_nome,
        e.nome as escola_nome
      FROM guia_produto_escola gpe
      INNER JOIN produtos p ON gpe.produto_id = p.id
      INNER JOIN escolas e ON gpe.escola_id = e.id
      WHERE LOWER(p.nome) LIKE '%banana%'
      ORDER BY gpe.id DESC
      LIMIT 5
    `);

    console.log(`\n📋 Itens de Banana na guia: ${itensResult.rows.length}`);
    
    if (itensResult.rows.length > 0) {
      console.log('\n📦 Detalhes dos itens:');
      itensResult.rows.forEach(row => {
        console.log('─'.repeat(100));
        console.log(`ID: ${row.id}`);
        console.log(`Produto: ${row.produto_nome}`);
        console.log(`Escola: ${row.escola_nome}`);
        console.log(`Quantidade programada: ${row.quantidade} ${row.unidade}`);
        console.log(`Quantidade total entregue: ${row.quantidade_total_entregue || 0} ${row.unidade}`);
        console.log(`Status: ${row.status}`);
        console.log(`Data entrega: ${row.data_entrega ? new Date(row.data_entrega).toLocaleDateString('pt-BR') : 'N/A'}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

buscarBanana();
