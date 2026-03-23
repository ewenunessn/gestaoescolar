require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verificar() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando produto OVO...\n');
    
    // 1. Buscar produto OVO
    const produtoResult = await client.query(`
      SELECT * FROM produtos WHERE nome ILIKE '%ovo%'
    `);
    
    if (produtoResult.rows.length === 0) {
      console.log('❌ Produto OVO não encontrado');
      return;
    }
    
    console.log('📦 Produtos encontrados:');
    produtoResult.rows.forEach(p => {
      console.log(`   ID: ${p.id}`);
      console.log(`   Nome: ${p.nome}`);
      console.log(`   Unidade Distribuição: ${p.unidade_distribuicao}`);
      console.log(`   Peso: ${p.peso}g`);
      console.log(`   Fator Correção: ${p.fator_correcao}`);
      console.log(`   Tipo Fator: ${p.tipo_fator_correcao}`);
      console.log('');
    });
    
    const ovo = produtoResult.rows.find(p => p.nome.toLowerCase().includes('galinha'));
    if (!ovo) {
      console.log('❌ Ovo de Galinha não encontrado');
      return;
    }
    
    // 2. Verificar cardápios que usam OVO
    const cardapiosResult = await client.query(`
      SELECT 
        c.id,
        c.nome,
        ci.quantidade,
        ci.unidade,
        ci.per_capita
      FROM cardapios_modalidade c
      JOIN cardapio_itens ci ON c.id = ci.cardapio_id
      WHERE ci.produto_id = $1
      LIMIT 5
    `, [ovo.id]);
    
    console.log(`📋 Cardápios que usam OVO (${cardapiosResult.rows.length}):`);
    cardapiosResult.rows.forEach(c => {
      console.log(`   - ${c.nome}: ${c.quantidade} ${c.unidade} (per capita: ${c.per_capita})`);
    });
    console.log('');
    
    // 3. Verificar guia de março
    const guiaResult = await client.query(`
      SELECT 
        gpe.quantidade,
        gpe.unidade,
        e.nome as escola_nome,
        gpe.data_entrega
      FROM guia_produto_escola gpe
      JOIN guias g ON g.id = gpe.guia_id
      JOIN escolas e ON e.id = gpe.escola_id
      WHERE g.competencia_mes_ano = '2026-03'
        AND gpe.produto_id = $1
      ORDER BY e.nome
      LIMIT 10
    `, [ovo.id]);
    
    console.log(`📊 Guia de Março - OVO (${guiaResult.rows.length} registros):`);
    let totalKg = 0;
    let totalUnidades = 0;
    
    guiaResult.rows.forEach(g => {
      console.log(`   - ${g.escola_nome}: ${g.quantidade} ${g.unidade}`);
      if (g.unidade === 'kg') {
        totalKg += Number(g.quantidade);
      } else if (g.unidade === 'unidade' || g.unidade === 'un') {
        totalUnidades += Number(g.quantidade);
      }
    });
    
    console.log('');
    console.log(`📈 Total na guia:`);
    console.log(`   - ${totalKg.toFixed(2)} kg`);
    console.log(`   - ${totalUnidades} unidades`);
    console.log('');
    
    // 4. Verificar contrato
    const contratoResult = await client.query(`
      SELECT 
        cp.*,
        c.numero as contrato_numero,
        f.nome as fornecedor_nome
      FROM contrato_produtos cp
      JOIN contratos c ON c.id = cp.contrato_id
      JOIN fornecedores f ON f.id = c.fornecedor_id
      WHERE cp.produto_id = $1 AND cp.ativo = true
    `, [ovo.id]);
    
    console.log(`📄 Contratos ativos (${contratoResult.rows.length}):`);
    contratoResult.rows.forEach(c => {
      console.log(`   - ${c.fornecedor_nome}`);
      console.log(`     Contrato: ${c.contrato_numero}`);
      console.log(`     Preço: R$ ${Number(c.preco_unitario).toFixed(2)}`);
      console.log(`     Unidade Compra: ${c.unidade_compra || 'não definida'}`);
      console.log(`     Peso Embalagem: ${c.peso_embalagem || 'não definido'}g`);
      console.log(`     Fator Conversão: ${c.fator_conversao || 'não definido'}`);
      console.log('');
    });
    
    // 5. Análise
    console.log('🔍 ANÁLISE:');
    console.log('');
    
    if (ovo.unidade_distribuicao === 'kg' && totalUnidades > 0) {
      console.log('⚠️  PROBLEMA IDENTIFICADO:');
      console.log('   - Produto cadastrado com unidade_distribuicao = "kg"');
      console.log('   - Mas na guia tem valores em "unidades"');
      console.log('   - Sistema está interpretando unidades como kg');
      console.log('');
      console.log('💡 SOLUÇÃO:');
      console.log('   1. Alterar unidade_distribuicao do produto para "unidade" ou "un"');
      console.log('   2. Definir peso de 1 ovo (ex: 60g)');
      console.log('   3. Recalcular a guia');
      console.log('');
      console.log('📝 SQL para corrigir:');
      console.log(`   UPDATE produtos SET unidade_distribuicao = 'unidade', peso = 60 WHERE id = ${ovo.id};`);
    } else if (ovo.unidade_distribuicao !== 'kg' && totalKg > 0) {
      console.log('⚠️  PROBLEMA IDENTIFICADO:');
      console.log('   - Produto cadastrado com unidade_distribuicao = "' + ovo.unidade_distribuicao + '"');
      console.log('   - Mas na guia tem valores em "kg"');
      console.log('   - Dados inconsistentes');
      console.log('');
      console.log('💡 SOLUÇÃO:');
      console.log('   1. Padronizar: decidir se OVO é em kg ou unidade');
      console.log('   2. Recalcular toda a guia com a unidade correta');
    } else {
      console.log('✅ Unidades parecem consistentes');
      console.log(`   - Produto: ${ovo.unidade_distribuicao}`);
      console.log(`   - Guia: ${totalKg > 0 ? 'kg' : 'unidades'}`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

verificar();
