const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
});

async function verificarEntregasOvos() {
  try {
    // Buscar entregas de ovos no histórico
    const result = await pool.query(`
      SELECT 
        he.id,
        he.quantidade_entregue,
        he.data_entrega,
        he.nome_quem_entregou,
        he.nome_quem_recebeu,
        he.assinatura_base64,
        p.nome as produto,
        gpe.unidade,
        e.nome as escola
      FROM historico_entregas he
      JOIN guia_produto_escola gpe ON he.guia_produto_escola_id = gpe.id
      JOIN produtos p ON gpe.produto_id = p.id
      JOIN escolas e ON gpe.escola_id = e.id
      WHERE LOWER(p.nome) LIKE '%ovo%'
      ORDER BY he.data_entrega DESC
      LIMIT 20
    `);
    
    console.log('\n=== ENTREGAS DE OVOS NO BANCO NEON ===\n');
    
    if (result.rows.length === 0) {
      console.log('Nenhuma entrega de ovos encontrada.');
    } else {
      result.rows.forEach(row => {
        console.log(`ID: ${row.id}`);
        console.log(`Produto: ${row.produto}`);
        console.log(`Quantidade: ${row.quantidade_entregue} ${row.unidade}`);
        console.log(`Escola: ${row.escola}`);
        console.log(`Entregador: ${row.nome_quem_entregou}`);
        console.log(`Recebedor: ${row.nome_quem_recebeu}`);
        console.log(`Tem Assinatura: ${row.assinatura_base64 ? 'SIM' : 'NÃO'}`);
        console.log(`Data: ${new Date(row.data_entrega).toLocaleString('pt-BR')}`);
        console.log('---');
      });
      
      console.log(`\nTotal de entregas: ${result.rows.length}`);
    }
    
    // Buscar também na tabela guia_produto_escola para ver o total
    const totalResult = await pool.query(`
      SELECT 
        gpe.id,
        p.nome as produto,
        gpe.unidade,
        e.nome as escola,
        gpe.quantidade,
        gpe.quantidade_total_entregue,
        gpe.entrega_confirmada
      FROM guia_produto_escola gpe
      JOIN produtos p ON gpe.produto_id = p.id
      JOIN escolas e ON gpe.escola_id = e.id
      WHERE LOWER(p.nome) LIKE '%ovo%'
      ORDER BY gpe.id DESC
      LIMIT 10
    `);
    
    console.log('\n=== STATUS ATUAL DE OVOS NA GUIA ===\n');
    
    totalResult.rows.forEach(row => {
      console.log(`Escola: ${row.escola}`);
      console.log(`Produto: ${row.produto}`);
      console.log(`Programado: ${row.quantidade} ${row.unidade}`);
      console.log(`Total Entregue: ${row.quantidade_total_entregue || 0} ${row.unidade}`);
      console.log(`Status: ${row.entrega_confirmada ? 'CONFIRMADA' : 'PENDENTE'}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Erro ao verificar entregas:', error.message);
  } finally {
    await pool.end();
  }
}

verificarEntregasOvos();
