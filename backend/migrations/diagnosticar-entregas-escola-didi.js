const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
});

async function diagnosticarEntregasEscolaDidi() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Diagnosticando entregas da EMEF Prof. Didi...\n');

    // 1. Buscar a escola
    const escolaResult = await client.query(`
      SELECT id, nome FROM escolas 
      WHERE nome ILIKE '%didi%' OR nome ILIKE '%prof%didi%'
      ORDER BY nome
    `);

    if (escolaResult.rows.length === 0) {
      console.log('❌ Escola EMEF Prof. Didi não encontrada');
      return;
    }

    const escola = escolaResult.rows[0];
    console.log(`✅ Escola encontrada: ${escola.nome} (ID: ${escola.id})\n`);

    // 2. Verificar itens da escola na guia atual
    const itensResult = await client.query(`
      SELECT 
        gpe.id,
        gpe.quantidade,
        gpe.unidade,
        gpe.entrega_confirmada,
        gpe.status,
        gpe.para_entrega,
        COALESCE(gpe.quantidade_total_entregue, 0) as quantidade_total_entregue,
        (gpe.quantidade - COALESCE(gpe.quantidade_total_entregue, 0)) as saldo_pendente,
        p.nome as produto_nome,
        g.mes,
        g.ano
      FROM guia_produto_escola gpe
      INNER JOIN produtos p ON gpe.produto_id = p.id
      INNER JOIN guias g ON gpe.guia_id = g.id
      WHERE gpe.escola_id = $1 
        AND gpe.para_entrega = true 
        AND g.status = 'aberta'
      ORDER BY p.nome
    `, [escola.id]);

    console.log(`📦 Total de itens para entrega: ${itensResult.rows.length}\n`);

    let totalItens = 0;
    let itensEntregues = 0;
    let itensPendentes = 0;

    for (const item of itensResult.rows) {
      totalItens++;
      
      // Verificar histórico de entregas
      const historicoResult = await client.query(`
        SELECT 
          id,
          quantidade_entregue,
          data_entrega,
          nome_quem_entregou,
          nome_quem_recebeu
        FROM historico_entregas
        WHERE guia_produto_escola_id = $1
        ORDER BY data_entrega DESC
      `, [item.id]);

      const totalEntregueHistorico = historicoResult.rows.reduce((sum, h) => sum + parseFloat(h.quantidade_entregue), 0);
      
      console.log(`📋 ${item.produto_nome}:`);
      console.log(`   - Quantidade programada: ${item.quantidade} ${item.unidade}`);
      console.log(`   - Status: ${item.status}`);
      console.log(`   - Entrega confirmada: ${item.entrega_confirmada}`);
      console.log(`   - Quantidade total entregue (campo): ${item.quantidade_total_entregue}`);
      console.log(`   - Quantidade total entregue (histórico): ${totalEntregueHistorico}`);
      console.log(`   - Saldo pendente: ${item.saldo_pendente}`);
      console.log(`   - Histórico de entregas: ${historicoResult.rows.length}`);
      
      if (historicoResult.rows.length > 0) {
        historicoResult.rows.forEach((h, idx) => {
          const dataEntrega = h.data_entrega instanceof Date ? h.data_entrega.toISOString().split('T')[0] : h.data_entrega.toString().split('T')[0];
          console.log(`     ${idx + 1}. ${h.quantidade_entregue} ${item.unidade} em ${dataEntrega} (${h.nome_quem_entregou} → ${h.nome_quem_recebeu})`);
        });
      }

      // Verificar inconsistências
      if (Math.abs(item.quantidade_total_entregue - totalEntregueHistorico) > 0.01) {
        console.log(`   ⚠️  INCONSISTÊNCIA: Campo quantidade_total_entregue (${item.quantidade_total_entregue}) != Soma do histórico (${totalEntregueHistorico})`);
      }

      if (item.entrega_confirmada && item.saldo_pendente > 0.01) {
        console.log(`   ⚠️  INCONSISTÊNCIA: Item marcado como entregue mas ainda tem saldo pendente (${item.saldo_pendente})`);
      }

      if (!item.entrega_confirmada && item.saldo_pendente <= 0.01) {
        console.log(`   ⚠️  INCONSISTÊNCIA: Item não marcado como entregue mas não tem saldo pendente`);
      }

      // Contar para estatísticas
      if (item.entrega_confirmada || item.saldo_pendente <= 0.01) {
        itensEntregues++;
      } else {
        itensPendentes++;
      }

      console.log('');
    }

    // 3. Mostrar estatísticas calculadas
    console.log('📊 ESTATÍSTICAS CALCULADAS:');
    console.log(`   - Total de itens: ${totalItens}`);
    console.log(`   - Itens entregues: ${itensEntregues}`);
    console.log(`   - Itens pendentes: ${itensPendentes}`);
    console.log(`   - Percentual entregue: ${totalItens > 0 ? ((itensEntregues / totalItens) * 100).toFixed(2) : 0}%\n`);

    // 4. Verificar o que a API retorna
    const apiResult = await client.query(`
      SELECT
        e.id,
        e.nome,
        COUNT(gpe.id) as total_itens,
        SUM(CASE WHEN gpe.entrega_confirmada = true THEN 1 ELSE 0 END) as itens_entregues,
        ROUND(
          (SUM(CASE WHEN gpe.entrega_confirmada = true THEN 1 ELSE 0 END) * 100.0) / COUNT(gpe.id),
          2
        ) as percentual_entregue
      FROM escolas e
      INNER JOIN guia_produto_escola gpe ON e.id = gpe.escola_id
      INNER JOIN guias g ON gpe.guia_id = g.id
      WHERE e.id = $1 
        AND gpe.para_entrega = true 
        AND g.status = 'aberta'
      GROUP BY e.id, e.nome
    `, [escola.id]);

    if (apiResult.rows.length > 0) {
      const api = apiResult.rows[0];
      console.log('🔌 DADOS DA API (listarEscolasComEntregas):');
      console.log(`   - Total de itens: ${api.total_itens}`);
      console.log(`   - Itens entregues: ${api.itens_entregues}`);
      console.log(`   - Percentual entregue: ${api.percentual_entregue}%\n`);
    }

    // 5. Propor correção se necessário
    const itensInconsistentes = itensResult.rows.filter(item => {
      return item.entrega_confirmada && item.saldo_pendente > 0.01;
    });

    if (itensInconsistentes.length > 0) {
      console.log('🔧 CORREÇÃO NECESSÁRIA:');
      console.log(`   Encontrados ${itensInconsistentes.length} itens com inconsistências.`);
      console.log('   Execute o script de correção para resolver.\n');
    } else {
      console.log('✅ Nenhuma inconsistência encontrada nos dados.\n');
    }

  } catch (error) {
    console.error('❌ Erro durante diagnóstico:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar diagnóstico
diagnosticarEntregasEscolaDidi().catch(console.error);