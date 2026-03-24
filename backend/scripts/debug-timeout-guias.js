const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function debugTimeout() {
  console.log('\n🔍 INVESTIGANDO TIMEOUT AO GERAR GUIAS\n');

  try {
    // 1. Verificar se a coluna indice_coccao existe
    console.log('1️⃣ Verificando se coluna indice_coccao existe...');
    const colunas = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'produtos' 
      AND column_name IN ('fator_correcao', 'indice_coccao')
      ORDER BY column_name
    `);
    
    console.log('Colunas encontradas:');
    colunas.rows.forEach(c => {
      console.log(`  ✓ ${c.column_name} (${c.data_type})`);
    });

    if (colunas.rows.length < 2) {
      console.log('\n❌ PROBLEMA: Coluna indice_coccao não existe!');
      console.log('Execute a migration: node scripts/executar-migration-indice-coccao.js');
      process.exit(1);
    }

    // 2. Testar a query problemática (simplificada)
    console.log('\n2️⃣ Testando query de cardápios...');
    const inicio = Date.now();
    
    const cardapios = await pool.query(`
      SELECT DISTINCT cm.id, cm2.modalidade_id
      FROM cardapios_modalidade cm
      INNER JOIN cardapio_refeicoes_dia crd ON crd.cardapio_modalidade_id = cm.id
      LEFT JOIN cardapio_modalidades cm2 ON cm2.cardapio_id = cm.id
      WHERE cm.ativo = true 
        AND cm.ano = 2026 
        AND cm.mes = 3
        AND cm2.modalidade_id IS NOT NULL
      LIMIT 5
    `);
    
    const tempo1 = Date.now() - inicio;
    console.log(`  ✓ Query cardápios: ${tempo1}ms (${cardapios.rows.length} resultados)`);

    if (cardapios.rows.length === 0) {
      console.log('\n⚠️ Nenhum cardápio ativo encontrado para 2026-03');
      process.exit(0);
    }

    // 3. Testar query de refeições com indice_coccao
    console.log('\n3️⃣ Testando query de refeições com indice_coccao...');
    const inicio2 = Date.now();
    
    const refeicoes = await pool.query(`
      SELECT
        crd.dia,
        cm2.modalidade_id,
        rp.produto_id,
        p.nome as produto_nome,
        p.unidade_distribuicao as unidade,
        p.peso as peso_embalagem,
        COALESCE(p.fator_correcao, 1.0) as fator_correcao,
        COALESCE(p.indice_coccao, 1.0) as indice_coccao,
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
        AND crd.dia BETWEEN 1 AND 31
      LIMIT 10
    `, [cardapios.rows.map(c => c.id)]);
    
    const tempo2 = Date.now() - inicio2;
    console.log(`  ✓ Query refeições: ${tempo2}ms (${refeicoes.rows.length} resultados)`);

    if (refeicoes.rows.length > 0) {
      console.log('\n📊 Exemplo de dados retornados:');
      const exemplo = refeicoes.rows[0];
      console.log(`  Produto: ${exemplo.produto_nome}`);
      console.log(`  Fator Correção: ${exemplo.fator_correcao}`);
      console.log(`  Índice Cocção: ${exemplo.indice_coccao}`);
      console.log(`  Per Capita: ${exemplo.per_capita}`);
    }

    // 4. Verificar índices
    console.log('\n4️⃣ Verificando índices nas tabelas...');
    const indices = await pool.query(`
      SELECT 
        tablename, 
        indexname, 
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('produtos', 'cardapio_refeicoes_dia', 'refeicao_produtos')
      ORDER BY tablename, indexname
    `);
    
    console.log('Índices encontrados:');
    indices.rows.forEach(idx => {
      console.log(`  • ${idx.tablename}.${idx.indexname}`);
    });

    // 5. Análise de performance
    console.log('\n5️⃣ Análise de performance:');
    if (tempo1 > 1000) {
      console.log(`  ⚠️ Query de cardápios está lenta (${tempo1}ms)`);
    }
    if (tempo2 > 5000) {
      console.log(`  ⚠️ Query de refeições está MUITO lenta (${tempo2}ms)`);
      console.log('  Sugestão: Adicionar índices ou otimizar query');
    }
    if (tempo1 < 1000 && tempo2 < 5000) {
      console.log('  ✓ Queries estão com performance aceitável');
    }

    console.log('\n✅ Investigação concluída!');
    console.log('\nPossíveis causas do timeout:');
    console.log('  1. Muitos dados para processar (muitas escolas/cardápios)');
    console.log('  2. Falta de índices nas tabelas');
    console.log('  3. Query complexa com muitos JOINs');
    console.log('  4. Banco de dados lento (Neon free tier)');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    if (error.message.includes('indice_coccao')) {
      console.log('\n💡 SOLUÇÃO: Execute a migration do indice_coccao:');
      console.log('   node scripts/executar-migration-indice-coccao.js');
    }
  } finally {
    await pool.end();
  }
}

debugTimeout();
