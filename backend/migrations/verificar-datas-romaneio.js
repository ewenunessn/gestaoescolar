/**
 * Verifica se as datas do romaneio (guia_produto_escola) batem com as datas da guia
 * Compara data_entrega dos itens vs competencia_mes_ano da guia
 */
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function verificar() {
  const client = await pool.connect();
  try {
    // 1. Buscar guias existentes
    const guias = await client.query(`
      SELECT id, nome, mes, ano, competencia_mes_ano, status
      FROM guias
      ORDER BY ano DESC, mes DESC
      LIMIT 10
    `);

    console.log('\n=== GUIAS ENCONTRADAS ===');
    guias.rows.forEach(g => {
      console.log(`  ID ${g.id} | ${g.nome} | ${g.competencia_mes_ano} | status: ${g.status}`);
    });

    if (guias.rows.length === 0) {
      console.log('Nenhuma guia encontrada.');
      return;
    }

    // 2. Para cada guia, verificar datas dos itens
    for (const guia of guias.rows) {
      const itens = await client.query(`
        SELECT
          gpe.id,
          gpe.data_entrega,
          gpe.data_entrega::date as data_entrega_date,
          TO_CHAR(gpe.data_entrega, 'YYYY-MM-DD') as data_formatada,
          EXTRACT(YEAR FROM gpe.data_entrega) as ano_item,
          EXTRACT(MONTH FROM gpe.data_entrega) as mes_item,
          p.nome as produto,
          e.nome as escola
        FROM guia_produto_escola gpe
        JOIN produtos p ON p.id = gpe.produto_id
        JOIN escolas e ON e.id = gpe.escola_id
        WHERE gpe.guia_id = $1
        ORDER BY gpe.data_entrega
        LIMIT 20
      `, [guia.id]);

      if (itens.rows.length === 0) {
        console.log(`\nGuia ${guia.id} (${guia.competencia_mes_ano}): sem itens`);
        continue;
      }

      // Verificar se mês/ano dos itens bate com a competência da guia
      const [anoGuia, mesGuia] = guia.competencia_mes_ano.split('-').map(Number);
      const inconsistentes = itens.rows.filter(i =>
        Number(i.ano_item) !== anoGuia || Number(i.mes_item) !== mesGuia
      );

      console.log(`\n=== Guia ${guia.id} | ${guia.nome} | Competência: ${guia.competencia_mes_ano} ===`);
      console.log(`  Total itens: ${itens.rows.length} | Inconsistentes: ${inconsistentes.length}`);

      // Mostrar datas únicas dos itens
      const datasUnicas = [...new Set(itens.rows.map(i => i.data_formatada))].sort();
      console.log(`  Datas nos itens: ${datasUnicas.join(', ')}`);

      if (inconsistentes.length > 0) {
        console.log('  ⚠️  INCONSISTÊNCIAS:');
        inconsistentes.slice(0, 5).forEach(i => {
          console.log(`    - ${i.produto} / ${i.escola}: data_entrega = ${i.data_formatada} (esperado mês ${mesGuia}/${anoGuia})`);
        });
      } else {
        console.log('  ✅ Todas as datas batem com a competência da guia');
      }

      // Mostrar amostra dos primeiros itens com data raw do banco
      console.log('  Amostra (raw do banco):');
      itens.rows.slice(0, 3).forEach(i => {
        console.log(`    ${i.produto} | data_entrega raw: ${JSON.stringify(i.data_entrega)} | formatada: ${i.data_formatada}`);
      });
    }

    // 3. Simular o que o romaneio retorna (mesma query do model)
    const primeiraGuia = guias.rows[0];
    const [anoG, mesG] = primeiraGuia.competencia_mes_ano.split('-').map(Number);
    const dataInicio = `${anoG}-${String(mesG).padStart(2,'0')}-01`;
    const dataFim = new Date(anoG, mesG, 0).toISOString().split('T')[0]; // último dia do mês

    console.log(`\n=== SIMULANDO ROMANEIO para ${dataInicio} a ${dataFim} ===`);
    const romaneio = await client.query(`
      SELECT
        gpe.id,
        gpe.data_entrega,
        TO_CHAR(gpe.data_entrega, 'YYYY-MM-DD') as data_formatada,
        gpe.quantidade,
        gpe.unidade,
        gpe.status,
        p.nome as produto_nome,
        e.nome as escola_nome
      FROM guia_produto_escola gpe
      JOIN produtos p ON gpe.produto_id = p.id
      JOIN escolas e ON gpe.escola_id = e.id
      WHERE gpe.data_entrega >= $1
        AND gpe.data_entrega <= $2
        AND (gpe.status != 'cancelado' OR gpe.status IS NULL)
      ORDER BY gpe.data_entrega, e.nome, p.nome
      LIMIT 10
    `, [dataInicio, dataFim]);

    console.log(`  Itens retornados: ${romaneio.rows.length}`);
    romaneio.rows.forEach(r => {
      console.log(`  ${r.data_formatada} | ${r.produto_nome} | ${r.escola_nome} | ${r.quantidade} ${r.unidade}`);
    });

  } finally {
    client.release();
    await pool.end();
  }
}

verificar().catch(console.error);
