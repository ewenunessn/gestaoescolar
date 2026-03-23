require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function investigar() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Investigando cálculo de demanda para OVO...\n');
    
    // 1. Buscar escola Berço da Liberdade
    const escolaResult = await client.query(`
      SELECT e.id, e.nome, em.modalidade_id, em.quantidade_alunos
      FROM escolas e
      INNER JOIN escola_modalidades em ON em.escola_id = e.id
      WHERE e.nome ILIKE '%berço%liberdade%'
    `);
    
    if (escolaResult.rows.length === 0) {
      console.log('❌ Escola não encontrada');
      return;
    }
    
    const escola = escolaResult.rows[0];
    console.log('🏫 Escola:', escola.nome);
    console.log('   ID:', escola.id);
    console.log('   Modalidade:', escola.modalidade_id);
    console.log('   Alunos:', escola.quantidade_alunos);
    console.log('');
    
    // 2. Buscar cardápios de março 2026
    const cardapiosResult = await client.query(`
      SELECT DISTINCT cm.id, cm.ano, cm.mes, cm2.modalidade_id
      FROM cardapios_modalidade cm
      INNER JOIN cardapio_modalidades cm2 ON cm2.cardapio_id = cm.id
      WHERE cm.ativo = true 
        AND cm.ano = 2026 
        AND cm.mes = 3
        AND cm2.modalidade_id = $1
    `, [escola.modalidade_id]);
    
    console.log(`📅 Cardápios encontrados: ${cardapiosResult.rows.length}`);
    cardapiosResult.rows.forEach(c => {
      console.log(`   ID: ${c.id}, Modalidade: ${c.modalidade_id}`);
    });
    console.log('');
    
    if (cardapiosResult.rows.length === 0) {
      console.log('❌ Nenhum cardápio encontrado para esta modalidade');
      return;
    }
    
    const cardapioIds = cardapiosResult.rows.map(c => c.id);
    
    // 3. Buscar refeições com OVO no período
    const refeicoesResult = await client.query(`
      SELECT
        crd.dia,
        crd.cardapio_modalidade_id,
        cm2.modalidade_id,
        r.id as refeicao_id,
        r.nome as refeicao_nome,
        rp.produto_id,
        p.nome as produto_nome,
        p.unidade_distribuicao,
        p.peso,
        COALESCE(p.fator_correcao, 1.0) as fator_correcao,
        COALESCE(rpm.per_capita_ajustado, rp.per_capita) as per_capita,
        rp.tipo_medida
      FROM cardapio_refeicoes_dia crd
      INNER JOIN cardapios_modalidade cm ON cm.id = crd.cardapio_modalidade_id
      INNER JOIN cardapio_modalidades cm2 ON cm2.cardapio_id = cm.id
      INNER JOIN refeicoes r ON r.id = crd.refeicao_id
      INNER JOIN refeicao_produtos rp ON rp.refeicao_id = r.id
      INNER JOIN produtos p ON p.id = rp.produto_id
      LEFT JOIN refeicao_produto_modalidade rpm
        ON rpm.refeicao_produto_id = rp.id AND rpm.modalidade_id = cm2.modalidade_id
      WHERE crd.cardapio_modalidade_id = ANY($1)
        AND crd.ativo = true
        AND p.nome ILIKE '%ovo%'
        AND crd.dia BETWEEN 1 AND 31
      ORDER BY crd.dia, r.nome
    `, [cardapioIds]);
    
    console.log(`🍳 Refeições com OVO: ${refeicoesResult.rows.length}`);
    console.log('');
    
    if (refeicoesResult.rows.length === 0) {
      console.log('❌ Nenhuma refeição com ovo encontrada');
      return;
    }
    
    // 4. Simular cálculo
    console.log('📊 SIMULAÇÃO DO CÁLCULO:\n');
    
    const ocorrenciasPorProduto = new Map();
    
    refeicoesResult.rows.forEach(ref => {
      if (!ocorrenciasPorProduto.has(ref.produto_id)) {
        ocorrenciasPorProduto.set(ref.produto_id, []);
      }
      ocorrenciasPorProduto.get(ref.produto_id).push(ref);
    });
    
    for (const [produto_id, ocorrencias] of ocorrenciasPorProduto.entries()) {
      const ref = ocorrencias[0];
      
      console.log(`🥚 Produto: ${ref.produto_nome} (ID: ${produto_id})`);
      console.log(`   Unidade: ${ref.unidade_distribuicao}`);
      console.log(`   Peso: ${ref.peso}g`);
      console.log(`   Tipo Medida: ${ref.tipo_medida}`);
      console.log(`   Per Capita: ${ref.per_capita}`);
      console.log(`   Fator Correção: ${ref.fator_correcao}`);
      console.log(`   Frequência: ${ocorrencias.length} refeições`);
      console.log('');
      
      console.log('   📅 Ocorrências:');
      ocorrencias.forEach(o => {
        console.log(`      Dia ${o.dia}: ${o.refeicao_nome} (per capita: ${o.per_capita})`);
      });
      console.log('');
      
      // CÁLCULO ATUAL (ERRADO)
      console.log('   ❌ CÁLCULO ATUAL (ERRADO):');
      const perCapitaGramas = ref.tipo_medida === 'unidades' ? ref.per_capita * 100 : ref.per_capita;
      const qtdKgErrado = (escola.quantidade_alunos * perCapitaGramas * ocorrencias.length) / 1000;
      const qtdUnidadesErrado = (qtdKgErrado * 1000) / (ref.peso || 100);
      console.log(`      Per capita em gramas: ${ref.per_capita} × 100 = ${perCapitaGramas}g`);
      console.log(`      Quantidade kg: ${escola.quantidade_alunos} alunos × ${perCapitaGramas}g × ${ocorrencias.length} refeições ÷ 1000 = ${qtdKgErrado.toFixed(3)}kg`);
      console.log(`      Quantidade unidades: ${qtdKgErrado.toFixed(3)}kg × 1000 ÷ ${ref.peso}g = ${qtdUnidadesErrado.toFixed(0)} unidades`);
      console.log('');
      
      // CÁLCULO CORRETO
      console.log('   ✅ CÁLCULO CORRETO:');
      const qtdUnidadesCorreto = escola.quantidade_alunos * ref.per_capita * ocorrencias.length;
      const qtdKgCorreto = (qtdUnidadesCorreto * ref.peso) / 1000;
      console.log(`      Quantidade unidades: ${escola.quantidade_alunos} alunos × ${ref.per_capita} un × ${ocorrencias.length} refeições = ${qtdUnidadesCorreto} unidades`);
      console.log(`      Quantidade kg: ${qtdUnidadesCorreto} un × ${ref.peso}g ÷ 1000 = ${qtdKgCorreto.toFixed(3)}kg`);
      console.log('');
      
      console.log('   📊 COMPARAÇÃO:');
      console.log(`      Errado: ${qtdUnidadesErrado.toFixed(0)} unidades`);
      console.log(`      Correto: ${qtdUnidadesCorreto} unidades`);
      console.log(`      Diferença: ${(qtdUnidadesErrado - qtdUnidadesCorreto).toFixed(0)} unidades (${((qtdUnidadesErrado / qtdUnidadesCorreto - 1) * 100).toFixed(1)}%)`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

investigar();
