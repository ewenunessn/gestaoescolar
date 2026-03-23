require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function investigar() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Investigando demanda de OVO para Berço da Liberdade...\n');
    
    // 1. Buscar escola
    const escolaResult = await client.query(`
      SELECT e.id, e.nome, 
             COALESCE(SUM(em.quantidade_alunos), 0) as total_alunos
      FROM escolas e
      LEFT JOIN escola_modalidades em ON em.escola_id = e.id
      WHERE e.nome ILIKE '%berço%liberdade%'
      GROUP BY e.id, e.nome
    `);
    
    if (escolaResult.rows.length === 0) {
      console.log('❌ Escola não encontrada');
      return;
    }
    
    const escola = escolaResult.rows[0];
    console.log('🏫 Escola:', escola.nome);
    console.log('👥 Alunos:', escola.total_alunos);
    console.log('');
    
    // 2. Buscar produto OVO
    const produtoResult = await client.query(`
      SELECT id, nome FROM produtos WHERE nome ILIKE '%ovo%galinha%'
    `);
    
    if (produtoResult.rows.length === 0) {
      console.log('❌ Produto OVO não encontrado');
      return;
    }
    
    const ovo = produtoResult.rows[0];
    console.log('🥚 Produto:', ovo.nome, '(ID:', ovo.id + ')');
    console.log('');
    
    // 3. Buscar na guia de março
    const guiaResult = await client.query(`
      SELECT 
        gpe.id,
        gpe.quantidade,
        gpe.unidade,
        gpe.data_entrega,
        g.nome as guia_nome,
        g.competencia_mes_ano
      FROM guia_produto_escola gpe
      JOIN guias g ON g.id = gpe.guia_id
      WHERE g.competencia_mes_ano = '2026-03'
        AND gpe.escola_id = $1
        AND gpe.produto_id = $2
      ORDER BY gpe.data_entrega
    `, [escola.id, ovo.id]);
    
    console.log(`📊 Registros na Guia de Março: ${guiaResult.rows.length}`);
    console.log('');
    
    let totalUnidades = 0;
    const porData = new Map();
    
    guiaResult.rows.forEach(g => {
      const data = g.data_entrega ? new Date(g.data_entrega).toISOString().split('T')[0] : 'sem data';
      const qtd = Number(g.quantidade);
      
      console.log(`   ${data}: ${qtd} ${g.unidade}`);
      
      totalUnidades += qtd;
      
      if (!porData.has(data)) {
        porData.set(data, 0);
      }
      porData.set(data, porData.get(data) + qtd);
    });
    
    console.log('');
    console.log(`📈 Total: ${totalUnidades} unidades`);
    console.log(`📊 Per capita real: ${(totalUnidades / escola.total_alunos).toFixed(2)} ovos/aluno`);
    console.log('');
    
    // 4. Agrupar por data
    console.log('📅 Por data:');
    for (const [data, qtd] of porData.entries()) {
      const perCapita = (qtd / escola.total_alunos).toFixed(2);
      console.log(`   ${data}: ${qtd} unidades (${perCapita} ovos/aluno)`);
    }
    console.log('');
    
    // 5. Verificar se há múltiplas linhas para o mesmo dia
    const duplicados = Array.from(porData.entries()).filter(([data, qtd]) => {
      const registros = guiaResult.rows.filter(g => {
        const d = g.data_entrega ? new Date(g.data_entrega).toISOString().split('T')[0] : 'sem data';
        return d === data;
      });
      return registros.length > 1;
    });
    
    if (duplicados.length > 0) {
      console.log('⚠️  PROBLEMA: Múltiplos registros para o mesmo dia!');
      duplicados.forEach(([data, qtd]) => {
        const registros = guiaResult.rows.filter(g => {
          const d = g.data_entrega ? new Date(g.data_entrega).toISOString().split('T')[0] : 'sem data';
          return d === data;
        });
        console.log(`   ${data}: ${registros.length} registros`);
        registros.forEach(r => {
          console.log(`      - ID ${r.id}: ${r.quantidade} ${r.unidade}`);
        });
      });
      console.log('');
      console.log('💡 CAUSA: Provavelmente múltiplas refeições no mesmo dia');
      console.log('   (ex: café da manhã + almoço)');
    }
    
    // 6. Buscar programação de cardápios para março
    console.log('');
    console.log('🍽️  Verificando programação de cardápios...');
    
    const programacaoResult = await client.query(`
      SELECT 
        pc.data_refeicao,
        pc.tipo_refeicao,
        c.nome as cardapio_nome,
        em.quantidade_alunos
      FROM programacao_cardapios pc
      JOIN cardapios_modalidade c ON c.id = pc.cardapio_id
      JOIN escola_modalidades em ON em.id = pc.escola_modalidade_id
      WHERE em.escola_id = $1
        AND pc.data_refeicao >= '2026-03-01'
        AND pc.data_refeicao < '2026-04-01'
        AND EXISTS (
          SELECT 1 FROM cardapio_itens ci
          WHERE ci.cardapio_id = c.id
          AND ci.produto_id = $2
        )
      ORDER BY pc.data_refeicao, pc.tipo_refeicao
    `, [escola.id, ovo.id]);
    
    console.log(`📅 Refeições programadas com OVO: ${programacaoResult.rows.length}`);
    
    const refeicoesporDia = new Map();
    programacaoResult.rows.forEach(p => {
      const data = new Date(p.data_refeicao).toISOString().split('T')[0];
      if (!refeicoesporDia.has(data)) {
        refeicoesporDia.set(data, []);
      }
      refeicoesporDia.get(data).push({
        tipo: p.tipo_refeicao,
        cardapio: p.cardapio_nome,
        alunos: p.quantidade_alunos
      });
    });
    
    for (const [data, refeicoes] of refeicoesporDia.entries()) {
      console.log(`   ${data}: ${refeicoes.length} refeição(ões)`);
      refeicoes.forEach(r => {
        console.log(`      - ${r.tipo}: ${r.cardapio} (${r.alunos} alunos)`);
      });
    }
    
    console.log('');
    console.log('🔍 ANÁLISE:');
    
    if (duplicados.length > 0 && refeicoesporDia.size > 0) {
      console.log('✅ Múltiplas refeições no mesmo dia explicam a quantidade');
      console.log('   Exemplo: Se tem café da manhã + almoço com ovo,');
      console.log(`   então ${escola.total_alunos} alunos × 2 refeições = ${escola.total_alunos * 2} ovos`);
    } else if (totalUnidades > escola.total_alunos * 1.2) {
      console.log('⚠️  Quantidade parece alta demais');
      console.log('   Verifique se não há duplicação de dados');
    } else {
      console.log('✅ Quantidade parece razoável');
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
