const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
});

async function testarAPI() {
  try {
    // Buscar ID da escola "EMEF José Salomão Solon"
    const escolaResult = await pool.query(`
      SELECT id, nome FROM escolas WHERE nome LIKE '%José Salomão%'
    `);
    
    if (escolaResult.rows.length === 0) {
      console.log('Escola não encontrada');
      return;
    }
    
    const escolaId = escolaResult.rows[0].id;
    console.log(`\n=== TESTANDO API PARA ESCOLA: ${escolaResult.rows[0].nome} (ID: ${escolaId}) ===\n`);
    
    // Simular a query da API
    const result = await pool.query(`
      SELECT 
        gpe.*,
        p.nome as produto_nome,
        gpe.unidade as produto_unidade,
        g.mes,
        g.ano,
        g.observacao as guia_observacao,
        COALESCE(gpe.quantidade_total_entregue, 0) as quantidade_ja_entregue,
        (gpe.quantidade - COALESCE(gpe.quantidade_total_entregue, 0)) as saldo_pendente,
        -- Buscar a última entrega do histórico
        (
          SELECT json_agg(
            json_build_object(
              'id', he.id,
              'quantidade_entregue', he.quantidade_entregue,
              'data_entrega', he.data_entrega,
              'nome_quem_entregou', he.nome_quem_entregou,
              'nome_quem_recebeu', he.nome_quem_recebeu,
              'observacao', he.observacao
            ) ORDER BY he.data_entrega DESC
          )
          FROM historico_entregas he
          WHERE he.guia_produto_escola_id = gpe.id
        ) as historico_entregas
      FROM guia_produto_escola gpe
      INNER JOIN produtos p ON gpe.produto_id = p.id
      INNER JOIN guias g ON gpe.guia_id = g.id
      WHERE gpe.escola_id = $1 AND gpe.para_entrega = true AND g.status = 'aberta'
      ORDER BY 
        gpe.entrega_confirmada ASC,
        g.mes DESC, 
        g.ano DESC, 
        p.nome, 
        gpe.lote
    `, [escolaId]);
    
    console.log(`Total de itens retornados: ${result.rows.length}\n`);
    
    result.rows.forEach((item, index) => {
      console.log(`\n[${index + 1}] ${item.produto_nome}`);
      console.log(`ID: ${item.id}`);
      console.log(`Quantidade programada: ${item.quantidade} ${item.produto_unidade}`);
      console.log(`Quantidade já entregue: ${item.quantidade_ja_entregue} ${item.produto_unidade}`);
      console.log(`Saldo pendente: ${item.saldo_pendente} ${item.produto_unidade}`);
      console.log(`Entrega confirmada: ${item.entrega_confirmada ? 'SIM' : 'NÃO'}`);
      console.log(`Histórico de entregas: ${item.historico_entregas ? JSON.stringify(item.historico_entregas, null, 2) : 'NENHUM'}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
}

testarAPI();
