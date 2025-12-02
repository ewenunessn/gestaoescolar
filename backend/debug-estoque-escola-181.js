require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alimentacao_escolar',
  password: process.env.DB_PASSWORD || 'admin123',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: false
});

async function debugEstoque() {
  const client = await pool.connect();
  
  try {
    const escolaId = 181;
    const produtoId = 40; // Arroz
    const tenantId = 'f830d523-25c9-4162-b241-6599df73171b';
    
    console.log('🔍 Investigando estoque da escola 181 - Produto Arroz...\n');
    
    // 1. Verificar estoque principal
    const estoqueResult = await client.query(`
      SELECT 
        id,
        escola_id,
        produto_id,
        quantidade_atual,
        tenant_id,
        created_at,
        updated_at
      FROM estoque_escolas
      WHERE escola_id = $1 AND produto_id = $2
    `, [escolaId, produtoId]);
    
    console.log('📦 Estoque Principal:');
    if (estoqueResult.rows.length > 0) {
      estoqueResult.rows.forEach(e => {
        console.log(`  ID: ${e.id}`);
        console.log(`  Quantidade Atual: ${e.quantidade_atual}`);
        console.log(`  Tenant: ${e.tenant_id}`);
        console.log(`  Criado em: ${e.created_at}`);
        console.log(`  Atualizado em: ${e.updated_at}`);
        console.log('');
      });
    } else {
      console.log('  (nenhum registro encontrado)');
    }
    
    // 2. Verificar lotes
    const lotesResult = await client.query(`
      SELECT 
        id,
        lote,
        quantidade_inicial,
        quantidade_atual,
        data_validade,
        status,
        tenant_id,
        created_at
      FROM estoque_lotes
      WHERE escola_id = $1 AND produto_id = $2
      ORDER BY created_at DESC
    `, [escolaId, produtoId]);
    
    console.log('📋 Lotes:');
    if (lotesResult.rows.length > 0) {
      let totalLotes = 0;
      lotesResult.rows.forEach(l => {
        console.log(`  Lote: ${l.lote}`);
        console.log(`    ID: ${l.id}`);
        console.log(`    Quantidade Inicial: ${l.quantidade_inicial}`);
        console.log(`    Quantidade Atual: ${l.quantidade_atual}`);
        console.log(`    Status: ${l.status}`);
        console.log(`    Validade: ${l.data_validade}`);
        console.log(`    Tenant: ${l.tenant_id}`);
        console.log('');
        
        if (l.status === 'ativo') {
          totalLotes += parseFloat(l.quantidade_atual);
        }
      });
      console.log(`  Total em lotes ativos: ${totalLotes}\n`);
    } else {
      console.log('  (nenhum lote encontrado)\n');
    }
    
    // 3. Verificar histórico de movimentações
    const historicoResult = await client.query(`
      SELECT 
        id,
        tipo_movimentacao,
        quantidade_anterior,
        quantidade_movimentada,
        quantidade_posterior,
        motivo,
        data_movimentacao,
        tenant_id
      FROM estoque_escolas_historico
      WHERE escola_id = $1 AND produto_id = $2
      ORDER BY data_movimentacao DESC
      LIMIT 10
    `, [escolaId, produtoId]);
    
    console.log('📜 Histórico de Movimentações (últimas 10):');
    if (historicoResult.rows.length > 0) {
      historicoResult.rows.forEach((h, index) => {
        console.log(`  ${index + 1}. ${h.tipo_movimentacao.toUpperCase()} - ${h.data_movimentacao}`);
        console.log(`     Anterior: ${h.quantidade_anterior} → Movimentado: ${h.quantidade_movimentada} → Posterior: ${h.quantidade_posterior}`);
        console.log(`     Motivo: ${h.motivo}`);
        console.log(`     Tenant: ${h.tenant_id}`);
        console.log('');
      });
    } else {
      console.log('  (nenhuma movimentação encontrada)\n');
    }
    
    // 4. Verificar se há registros duplicados
    const duplicadosResult = await client.query(`
      SELECT 
        escola_id,
        produto_id,
        COUNT(*) as total,
        array_agg(id) as ids,
        array_agg(tenant_id) as tenants
      FROM estoque_escolas
      WHERE escola_id = $1 AND produto_id = $2
      GROUP BY escola_id, produto_id
      HAVING COUNT(*) > 1
    `, [escolaId, produtoId]);
    
    if (duplicadosResult.rows.length > 0) {
      console.log('⚠️  PROBLEMA: Registros duplicados encontrados!');
      duplicadosResult.rows.forEach(d => {
        console.log(`  Escola: ${d.escola_id}, Produto: ${d.produto_id}`);
        console.log(`  Total de registros: ${d.total}`);
        console.log(`  IDs: ${d.ids.join(', ')}`);
        console.log(`  Tenants: ${d.tenants.join(', ')}`);
      });
      console.log('');
    }
    
    // 5. Verificar se há lotes de outros tenants
    const lotesOutrosTenants = await client.query(`
      SELECT 
        id,
        lote,
        quantidade_atual,
        tenant_id
      FROM estoque_lotes
      WHERE escola_id = $1 AND produto_id = $2 AND tenant_id != $3
    `, [escolaId, produtoId, tenantId]);
    
    if (lotesOutrosTenants.rows.length > 0) {
      console.log('⚠️  PROBLEMA: Lotes de outros tenants encontrados!');
      lotesOutrosTenants.rows.forEach(l => {
        console.log(`  Lote: ${l.lote}, Qtd: ${l.quantidade_atual}, Tenant: ${l.tenant_id}`);
      });
      console.log('');
    }
    
    // 6. Calcular o que deveria ser o estoque correto
    const totalLotesAtivos = await client.query(`
      SELECT COALESCE(SUM(quantidade_atual), 0) as total
      FROM estoque_lotes
      WHERE escola_id = $1 AND produto_id = $2 AND status = 'ativo' AND tenant_id = $3
    `, [escolaId, produtoId, tenantId]);
    
    const estoqueAtual = estoqueResult.rows[0]?.quantidade_atual || 0;
    const totalLotes = parseFloat(totalLotesAtivos.rows[0].total);
    
    console.log('📊 Análise:');
    console.log(`  Estoque Principal: ${estoqueAtual}`);
    console.log(`  Total em Lotes Ativos: ${totalLotes}`);
    console.log(`  Diferença: ${parseFloat(estoqueAtual) - totalLotes}`);
    
    if (Math.abs(parseFloat(estoqueAtual) - totalLotes) > 0.001) {
      console.log('\n⚠️  INCONSISTÊNCIA DETECTADA!');
      console.log('  O estoque principal não corresponde à soma dos lotes.');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

debugEstoque();
