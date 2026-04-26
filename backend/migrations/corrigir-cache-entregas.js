const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
});

async function corrigirCacheEntregas() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Forçando atualização dos dados de entregas...\n');

    // 1. Recalcular todos os campos de quantidade_total_entregue
    console.log('📊 Recalculando quantidade_total_entregue para todos os itens...');
    const updateResult = await client.query(`
      UPDATE guia_produto_escola
      SET 
        quantidade_total_entregue = (
          SELECT COALESCE(SUM(quantidade_entregue), 0)
          FROM historico_entregas
          WHERE guia_produto_escola_id = guia_produto_escola.id
        ),
        entrega_confirmada = (
          SELECT COALESCE(SUM(quantidade_entregue), 0) >= quantidade
          FROM historico_entregas
          WHERE guia_produto_escola_id = guia_produto_escola.id
        ),
        status = CASE 
          WHEN (SELECT COALESCE(SUM(quantidade_entregue), 0) FROM historico_entregas WHERE guia_produto_escola_id = guia_produto_escola.id) >= quantidade THEN 'entregue'
          WHEN (SELECT COALESCE(SUM(quantidade_entregue), 0) FROM historico_entregas WHERE guia_produto_escola_id = guia_produto_escola.id) > 0 THEN 'parcial'
          ELSE 'pendente'
        END,
        updated_at = NOW()
      WHERE para_entrega = true
    `);

    console.log(`✅ ${updateResult.rowCount} itens atualizados.\n`);

    // 2. Verificar especificamente a escola EMEF Prof. Didi
    console.log('🔍 Verificando dados atualizados da EMEF Prof. Didi...');
    
    const escolaResult = await client.query(`
      SELECT
        e.id,
        e.nome,
        COUNT(gpe.id) as total_itens,
        SUM(CASE WHEN gpe.entrega_confirmada = true THEN 1 ELSE 0 END) as itens_entregues,
        SUM(CASE WHEN gpe.entrega_confirmada = false THEN 1 ELSE 0 END) as itens_pendentes,
        ROUND(
          (SUM(CASE WHEN gpe.entrega_confirmada = true THEN 1 ELSE 0 END) * 100.0) / COUNT(gpe.id),
          2
        ) as percentual_entregue
      FROM escolas e
      INNER JOIN guia_produto_escola gpe ON e.id = gpe.escola_id
      INNER JOIN guias g ON gpe.guia_id = g.id
      WHERE e.nome ILIKE '%didi%'
        AND gpe.para_entrega = true 
        AND g.status = 'aberta'
      GROUP BY e.id, e.nome
    `);

    if (escolaResult.rows.length > 0) {
      const escola = escolaResult.rows[0];
      console.log(`📋 ${escola.nome}:`);
      console.log(`   - Total de itens: ${escola.total_itens}`);
      console.log(`   - Itens entregues: ${escola.itens_entregues}`);
      console.log(`   - Itens pendentes: ${escola.itens_pendentes}`);
      console.log(`   - Percentual entregue: ${escola.percentual_entregue}%\n`);
    }

    // 3. Limpar possíveis caches (se houver)
    console.log('🧹 Limpando caches...');
    
    // Se houver Redis configurado, limpar cache
    try {
      // Aqui você pode adicionar limpeza de cache Redis se estiver usando
      console.log('   - Cache Redis: não configurado');
    } catch (error) {
      console.log('   - Cache Redis: erro ao limpar ou não configurado');
    }

    console.log('✅ Correção concluída!\n');
    console.log('💡 Dica: Atualize a página no navegador para ver os dados corretos.');

  } catch (error) {
    console.error('❌ Erro durante correção:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar correção
corrigirCacheEntregas().catch(console.error);