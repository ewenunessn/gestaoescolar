/**
 * Script para debugar a query de resumo de estoque
 * Verificar por que está mostrando "6 de 6" em vez de "6 de 57"
 */

const db = require('./dist/database');

const ESCOLA_TESTE_TENANT_ID = '1cc9b18f-2b7d-412d-bb6d-4b8055e9590f';

async function debugEstoqueResumo() {
  console.log('🔍 Debugando query de resumo de estoque...\n');

  try {
    // 1. Verificar total de escolas no tenant
    console.log('=== TOTAL DE ESCOLAS NO TENANT ===');
    const totalEscolas = await db.query(`
      SELECT COUNT(*) as total_escolas
      FROM escolas 
      WHERE tenant_id = $1 AND ativo = true
    `, [ESCOLA_TESTE_TENANT_ID]);
    
    console.log(`Total de escolas ativas: ${totalEscolas.rows[0].total_escolas}`);

    // 2. Verificar escolas com estoque
    console.log('\n=== ESCOLAS COM ESTOQUE ===');
    const escolasComEstoque = await db.query(`
      SELECT COUNT(DISTINCT ee.escola_id) as escolas_com_estoque
      FROM estoque_escolas ee
      JOIN escolas e ON e.id = ee.escola_id
      WHERE ee.tenant_id = $1 AND e.tenant_id = $1 
        AND ee.quantidade_atual > 0
        AND e.ativo = true
    `, [ESCOLA_TESTE_TENANT_ID]);
    
    console.log(`Escolas com estoque: ${escolasComEstoque.rows[0].escolas_com_estoque}`);

    // 3. Verificar a query atual de resumo (como está sendo feita)
    console.log('\n=== QUERY ATUAL DE RESUMO (PROBLEMÁTICA) ===');
    const resumoAtual = await db.query(`
      WITH estoque_agregado AS (
        SELECT 
          p.id as produto_id,
          p.nome as produto_nome,
          p.descricao as produto_descricao,
          p.unidade,
          p.categoria,
          COUNT(DISTINCT e.id) as total_escolas,
          COUNT(DISTINCT ee.escola_id) FILTER (WHERE ee.quantidade_atual > 0) as total_escolas_com_estoque,
          COALESCE(SUM(ee.quantidade_atual), 0) as total_quantidade
        FROM produtos p
        CROSS JOIN escolas e
        LEFT JOIN estoque_escolas ee ON (ee.produto_id = p.id AND ee.escola_id = e.id)
        WHERE p.ativo = true AND e.ativo = true
          AND p.tenant_id = $1
          AND e.tenant_id = $1
          AND (ee.tenant_id = $1 OR ee.tenant_id IS NULL)
        GROUP BY p.id, p.nome, p.descricao, p.unidade, p.categoria
        HAVING COALESCE(SUM(ee.quantidade_atual), 0) > 0
      )
      SELECT *
      FROM estoque_agregado
      WHERE produto_nome = 'Arroz Branco'
      ORDER BY categoria NULLS LAST, produto_nome
    `, [ESCOLA_TESTE_TENANT_ID]);

    if (resumoAtual.rows.length > 0) {
      const arroz = resumoAtual.rows[0];
      console.log(`Produto: ${arroz.produto_nome}`);
      console.log(`Total escolas (PROBLEMÁTICO): ${arroz.total_escolas}`);
      console.log(`Escolas com estoque: ${arroz.total_escolas_com_estoque}`);
      console.log(`Quantidade total: ${arroz.total_quantidade}`);
    }

    // 4. Query corrigida
    console.log('\n=== QUERY CORRIGIDA ===');
    const resumoCorrigido = await db.query(`
      WITH produtos_tenant AS (
        SELECT p.id, p.nome, p.descricao, p.unidade, p.categoria
        FROM produtos p
        WHERE p.ativo = true AND p.tenant_id = $1
      ),
      escolas_tenant AS (
        SELECT COUNT(*) as total_escolas
        FROM escolas e
        WHERE e.ativo = true AND e.tenant_id = $1
      ),
      estoque_agregado AS (
        SELECT 
          pt.id as produto_id,
          pt.nome as produto_nome,
          pt.descricao as produto_descricao,
          pt.unidade,
          pt.categoria,
          et.total_escolas,
          COUNT(DISTINCT ee.escola_id) FILTER (WHERE ee.quantidade_atual > 0) as escolas_com_estoque,
          COALESCE(SUM(ee.quantidade_atual), 0) as total_quantidade
        FROM produtos_tenant pt
        CROSS JOIN escolas_tenant et
        LEFT JOIN estoque_escolas ee ON (ee.produto_id = pt.id AND ee.tenant_id = $1)
        GROUP BY pt.id, pt.nome, pt.descricao, pt.unidade, pt.categoria, et.total_escolas
        HAVING COALESCE(SUM(ee.quantidade_atual), 0) > 0
      )
      SELECT *
      FROM estoque_agregado
      WHERE produto_nome = 'Arroz Branco'
      ORDER BY categoria NULLS LAST, produto_nome
    `, [ESCOLA_TESTE_TENANT_ID]);

    if (resumoCorrigido.rows.length > 0) {
      const arroz = resumoCorrigido.rows[0];
      console.log(`Produto: ${arroz.produto_nome}`);
      console.log(`Total escolas (CORRIGIDO): ${arroz.total_escolas}`);
      console.log(`Escolas com estoque: ${arroz.escolas_com_estoque}`);
      console.log(`Quantidade total: ${arroz.total_quantidade}`);
    }

    // 5. Verificar detalhes do Arroz Branco
    console.log('\n=== DETALHES DO ARROZ BRANCO ===');
    const detalhesArroz = await db.query(`
      SELECT 
        e.id as escola_id,
        e.nome as escola_nome,
        ee.quantidade_atual,
        CASE WHEN ee.quantidade_atual > 0 THEN 'COM ESTOQUE' ELSE 'SEM ESTOQUE' END as status
      FROM escolas e
      LEFT JOIN estoque_escolas ee ON (ee.escola_id = e.id AND ee.tenant_id = $1)
      LEFT JOIN produtos p ON (p.id = ee.produto_id AND p.nome = 'Arroz Branco' AND p.tenant_id = $1)
      WHERE e.tenant_id = $1 AND e.ativo = true
        AND (p.id IS NOT NULL OR ee.id IS NULL)
      ORDER BY ee.quantidade_atual DESC NULLS LAST, e.nome
      LIMIT 10
    `, [ESCOLA_TESTE_TENANT_ID]);

    console.log('Primeiras 10 escolas:');
    detalhesArroz.rows.forEach((escola, index) => {
      console.log(`  ${index + 1}. ${escola.escola_nome}: ${escola.quantidade_atual || 0} kg (${escola.status})`);
    });

    // 6. Contar escolas com e sem estoque de Arroz Branco
    console.log('\n=== CONTAGEM ESPECÍFICA ARROZ BRANCO ===');
    const contagemArroz = await db.query(`
      SELECT 
        COUNT(*) as total_escolas,
        COUNT(ee.id) FILTER (WHERE ee.quantidade_atual > 0) as com_estoque,
        COUNT(*) - COUNT(ee.id) FILTER (WHERE ee.quantidade_atual > 0) as sem_estoque
      FROM escolas e
      LEFT JOIN estoque_escolas ee ON (
        ee.escola_id = e.id 
        AND ee.tenant_id = $1
        AND ee.produto_id = (SELECT id FROM produtos WHERE nome = 'Arroz Branco' AND tenant_id = $1)
      )
      WHERE e.tenant_id = $1 AND e.ativo = true
    `, [ESCOLA_TESTE_TENANT_ID]);

    const contagem = contagemArroz.rows[0];
    console.log(`Total de escolas: ${contagem.total_escolas}`);
    console.log(`Com estoque de Arroz Branco: ${contagem.com_estoque}`);
    console.log(`Sem estoque de Arroz Branco: ${contagem.sem_estoque}`);
    console.log(`Deveria mostrar: ${contagem.com_estoque} de ${contagem.total_escolas}`);

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  debugEstoqueResumo()
    .then(() => {
      console.log('\n✅ Debug concluído!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { debugEstoqueResumo };