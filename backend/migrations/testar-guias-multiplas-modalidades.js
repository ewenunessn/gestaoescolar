const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alimentacao_escolar',
  password: process.env.DB_PASSWORD || 'admin123',
  port: parseInt(process.env.DB_PORT || '5432')
});

async function testarGuiasMultiplasModalidades() {
  const client = await pool.connect();
  try {
    console.log('🧪 Testando geração de guias com múltiplas modalidades...\n');

    // 1. Verificar se há cardápios com múltiplas modalidades
    console.log('📋 1. Verificando cardápios com múltiplas modalidades:');
    const cardapiosMultiplos = await client.query(`
      SELECT 
        cm.id,
        cm.nome,
        cm.mes,
        cm.ano,
        COUNT(DISTINCT cm2.modalidade_id) as total_modalidades,
        STRING_AGG(DISTINCT m.nome, ', ') as modalidades_nomes
      FROM cardapios_modalidade cm
      LEFT JOIN cardapio_modalidades cm2 ON cm2.cardapio_id = cm.id
      LEFT JOIN modalidades m ON m.id = cm2.modalidade_id
      WHERE cm.ativo = true
      GROUP BY cm.id, cm.nome, cm.mes, cm.ano
      HAVING COUNT(DISTINCT cm2.modalidade_id) > 1
      ORDER BY cm.ano DESC, cm.mes DESC
      LIMIT 5
    `);

    if (cardapiosMultiplos.rows.length > 0) {
      console.log(`   ✅ Encontrados ${cardapiosMultiplos.rows.length} cardápios com múltiplas modalidades:`);
      cardapiosMultiplos.rows.forEach(c => {
        console.log(`   - ${c.nome} (${c.mes}/${c.ano}): ${c.total_modalidades} modalidades (${c.modalidades_nomes})`);
      });
    } else {
      console.log('   ⚠️  Nenhum cardápio com múltiplas modalidades encontrado');
      console.log('   💡 Crie um cardápio e associe a múltiplas modalidades para testar');
    }
    console.log('');

    // 2. Simular busca de cardápios para geração de guias
    console.log('📊 2. Simulando busca de cardápios para geração de guias:');
    const ano = new Date().getFullYear();
    const mes = new Date().getMonth() + 1;
    
    const cardapiosParaGuia = await client.query(`
      SELECT DISTINCT cm.id, cm2.modalidade_id
      FROM cardapios_modalidade cm
      INNER JOIN cardapio_refeicoes_dia crd ON crd.cardapio_modalidade_id = cm.id
      LEFT JOIN cardapio_modalidades cm2 ON cm2.cardapio_id = cm.id
      WHERE cm.ativo = true AND cm.ano = $1 AND cm.mes = $2
        AND cm2.modalidade_id IS NOT NULL
    `, [ano, mes]);

    console.log(`   Competência: ${mes}/${ano}`);
    console.log(`   Total de combinações cardápio+modalidade: ${cardapiosParaGuia.rows.length}`);
    
    // Agrupar por cardápio
    const cardapiosAgrupados = new Map();
    cardapiosParaGuia.rows.forEach(row => {
      if (!cardapiosAgrupados.has(row.id)) {
        cardapiosAgrupados.set(row.id, []);
      }
      cardapiosAgrupados.get(row.id).push(row.modalidade_id);
    });

    console.log(`   Cardápios únicos: ${cardapiosAgrupados.size}`);
    for (const [cardapioId, modalidades] of cardapiosAgrupados.entries()) {
      const cardapioInfo = await client.query(`
        SELECT nome FROM cardapios_modalidade WHERE id = $1
      `, [cardapioId]);
      console.log(`   - Cardápio ${cardapioId} (${cardapioInfo.rows[0]?.nome}): ${modalidades.length} modalidades`);
    }
    console.log('');

    // 3. Verificar escolas e modalidades
    console.log('🏫 3. Verificando escolas com modalidades:');
    const escolas = await client.query(`
      SELECT 
        e.id as escola_id,
        e.nome as escola_nome,
        em.modalidade_id,
        m.nome as modalidade_nome,
        em.quantidade_alunos
      FROM escolas e
      INNER JOIN escola_modalidades em ON em.escola_id = e.id
      INNER JOIN modalidades m ON m.id = em.modalidade_id
      WHERE e.ativo = true
      ORDER BY e.nome, m.nome
      LIMIT 10
    `);

    console.log(`   Total de combinações escola+modalidade: ${escolas.rows.length}`);
    escolas.rows.forEach(e => {
      console.log(`   - ${e.escola_nome} (${e.modalidade_nome}): ${e.quantidade_alunos} alunos`);
    });
    console.log('');

    // 4. Simular cálculo de demanda
    console.log('🧮 4. Simulando cálculo de demanda:');
    if (cardapiosParaGuia.rows.length > 0 && escolas.rows.length > 0) {
      const diaInicio = 1;
      const diaFim = 5;

      const refeicoes = await client.query(`
        SELECT
          crd.dia,
          cm2.modalidade_id,
          rp.produto_id,
          p.nome as produto_nome,
          COUNT(*) as ocorrencias
        FROM cardapio_refeicoes_dia crd
        INNER JOIN cardapios_modalidade cm ON cm.id = crd.cardapio_modalidade_id
        INNER JOIN cardapio_modalidades cm2 ON cm2.cardapio_id = cm.id
        INNER JOIN refeicoes r ON r.id = crd.refeicao_id
        INNER JOIN refeicao_produtos rp ON rp.refeicao_id = r.id
        INNER JOIN produtos p ON p.id = rp.produto_id
        WHERE crd.cardapio_modalidade_id = ANY($1)
          AND crd.ativo = true
          AND crd.dia BETWEEN $2 AND $3
        GROUP BY crd.dia, cm2.modalidade_id, rp.produto_id, p.nome
        ORDER BY cm2.modalidade_id, p.nome
        LIMIT 20
      `, [cardapiosParaGuia.rows.map(c => c.id), diaInicio, diaFim]);

      console.log(`   Período: dia ${diaInicio} a ${diaFim}`);
      console.log(`   Produtos encontrados: ${refeicoes.rows.length}`);
      
      // Agrupar por modalidade
      const porModalidade = new Map();
      refeicoes.rows.forEach(r => {
        if (!porModalidade.has(r.modalidade_id)) {
          porModalidade.set(r.modalidade_id, []);
        }
        porModalidade.get(r.modalidade_id).push(r);
      });

      for (const [modalidadeId, produtos] of porModalidade.entries()) {
        const modalidade = await client.query(`
          SELECT nome FROM modalidades WHERE id = $1
        `, [modalidadeId]);
        console.log(`   Modalidade ${modalidade.rows[0]?.nome}:`);
        produtos.slice(0, 5).forEach(p => {
          console.log(`     - ${p.produto_nome}: ${p.ocorrencias} ocorrências`);
        });
      }
    } else {
      console.log('   ⚠️  Não há dados suficientes para simular cálculo');
    }
    console.log('');

    // 5. Resumo
    console.log('📝 Resumo:');
    console.log(`   ✅ Tabela cardapio_modalidades: ${cardapiosParaGuia.rows.length > 0 ? 'Funcionando' : 'Sem dados'}`);
    console.log(`   ✅ Queries atualizadas: ${cardapiosParaGuia.rows.length > 0 ? 'Funcionando' : 'Aguardando dados'}`);
    console.log(`   ✅ Integração com escolas: ${escolas.rows.length > 0 ? 'OK' : 'Sem escolas'}`);
    console.log('');
    console.log('✅ Teste concluído!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

testarGuiasMultiplasModalidades().catch(console.error);
