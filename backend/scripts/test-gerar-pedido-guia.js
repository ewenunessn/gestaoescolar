require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

// Usar DATABASE_URL do Neon (mesmo do backend)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testarGerarPedido() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Testando geração de pedido da guia de março...\n');
    
    // 1. Buscar guia de março
    const guiaResult = await client.query(`
      SELECT id, mes, ano, competencia_mes_ano, nome, status 
      FROM guias 
      WHERE competencia_mes_ano = '2026-03' OR (mes = 3 AND ano = 2026)
      ORDER BY id DESC
      LIMIT 1
    `);
    
    if (guiaResult.rows.length === 0) {
      console.log('❌ Nenhuma guia encontrada para março/2026');
      return;
    }
    
    const guia = guiaResult.rows[0];
    console.log('📋 Guia encontrada:', {
      id: guia.id,
      nome: guia.nome,
      competencia: guia.competencia_mes_ano,
      status: guia.status
    });
    console.log('');
    
    // 2. Buscar produtos da guia
    const produtosResult = await client.query(`
      SELECT DISTINCT
        gpe.produto_id,
        p.nome as produto_nome,
        SUM(gpe.quantidade) as quantidade_total
      FROM guia_produto_escola gpe
      JOIN produtos p ON p.id = gpe.produto_id
      WHERE gpe.guia_id = $1 AND gpe.quantidade > 0
      GROUP BY gpe.produto_id, p.nome
      ORDER BY p.nome
    `, [guia.id]);
    
    console.log(`📦 Produtos na guia: ${produtosResult.rows.length}`);
    produtosResult.rows.forEach(p => {
      console.log(`   - ${p.produto_nome}: ${Number(p.quantidade_total).toFixed(2)} kg`);
    });
    console.log('');
    
    // 3. Verificar contratos para cada produto
    const produtoIds = produtosResult.rows.map(p => p.produto_id);
    const contratosResult = await client.query(`
      SELECT 
        cp.produto_id,
        p.nome as produto_nome,
        COUNT(*) as total_contratos,
        array_agg(
          json_build_object(
            'contrato_id', c.id,
            'numero', c.numero,
            'fornecedor', f.nome,
            'preco', cp.preco_unitario,
            'saldo', COALESCE(
              (SELECT SUM(cpm2.quantidade_disponivel) 
               FROM contrato_produtos_modalidades cpm2 
               WHERE cpm2.contrato_produto_id = cp.id AND cpm2.ativo = true),
              cp.quantidade_contratada
            )
          )
        ) as contratos
      FROM contrato_produtos cp
      JOIN contratos c ON c.id = cp.contrato_id
      JOIN fornecedores f ON f.id = c.fornecedor_id
      JOIN produtos p ON p.id = cp.produto_id
      WHERE cp.produto_id = ANY($1) 
        AND cp.ativo = true
        AND c.status = 'ativo' 
        AND c.data_fim >= CURRENT_DATE
      GROUP BY cp.produto_id, p.nome
      ORDER BY p.nome
    `, [produtoIds]);
    
    console.log('📊 Análise de contratos:');
    
    const produtosSemContrato = [];
    const produtosComUmContrato = [];
    const produtosComMultiplosContratos = [];
    
    produtosResult.rows.forEach(produto => {
      const contratoInfo = contratosResult.rows.find(c => c.produto_id === produto.produto_id);
      
      if (!contratoInfo) {
        produtosSemContrato.push(produto);
        console.log(`   ❌ ${produto.produto_nome}: SEM CONTRATO`);
      } else if (contratoInfo.total_contratos === '1' || Number(contratoInfo.total_contratos) === 1) {
        produtosComUmContrato.push({ ...produto, contratos: contratoInfo.contratos });
        const contrato = contratoInfo.contratos[0];
        console.log(`   ✅ ${produto.produto_nome}: 1 contrato (${contrato.fornecedor} - R$ ${Number(contrato.preco).toFixed(2)})`);
      } else {
        produtosComMultiplosContratos.push({ ...produto, contratos: contratoInfo.contratos });
        console.log(`   ⚠️  ${produto.produto_nome}: ${contratoInfo.total_contratos} contratos`);
        contratoInfo.contratos.forEach(c => {
          console.log(`      - ${c.fornecedor}: R$ ${Number(c.preco).toFixed(2)} (saldo: ${Number(c.saldo).toFixed(2)})`);
        });
      }
    });
    
    console.log('');
    console.log('📈 Resumo:');
    console.log(`   ✅ Produtos com 1 contrato: ${produtosComUmContrato.length}`);
    console.log(`   ⚠️  Produtos com múltiplos contratos: ${produtosComMultiplosContratos.length}`);
    console.log(`   ❌ Produtos sem contrato: ${produtosSemContrato.length}`);
    console.log('');
    
    // 4. Decisão
    if (produtosSemContrato.length === produtosResult.rows.length) {
      console.log('❌ IMPOSSÍVEL GERAR PEDIDO: Nenhum produto tem contrato ativo');
      return;
    }
    
    if (produtosComMultiplosContratos.length > 0) {
      console.log('⚠️  AÇÃO NECESSÁRIA: Produtos com múltiplos contratos precisam de seleção manual');
      console.log('');
      console.log('💡 Opções:');
      console.log('   1. Usar a tela de Planejamento de Compras para selecionar contratos');
      console.log('   2. Implementar seleção automática (ex: mais barato, maior saldo)');
      console.log('');
      
      // Mostrar qual seria a escolha automática (mais barato)
      console.log('🤖 Se usar seleção automática (mais barato):');
      produtosComMultiplosContratos.forEach(p => {
        const maisBarato = p.contratos.reduce((prev, curr) => 
          Number(curr.preco) < Number(prev.preco) ? curr : prev
        );
        console.log(`   - ${p.produto_nome}: ${maisBarato.fornecedor} (R$ ${Number(maisBarato.preco).toFixed(2)})`);
      });
      console.log('');
    }
    
    if (produtosSemContrato.length > 0) {
      console.log('⚠️  AVISO: Produtos sem contrato serão ignorados:');
      produtosSemContrato.forEach(p => {
        console.log(`   - ${p.produto_nome} (${Number(p.quantidade_total).toFixed(2)} kg)`);
      });
      console.log('');
    }
    
    // 5. Simular geração (sem commit)
    if (produtosComMultiplosContratos.length === 0) {
      console.log('✅ PODE GERAR PEDIDO: Todos os produtos com contrato têm apenas 1 opção');
      console.log('');
      console.log('📝 Pedido seria criado com:');
      console.log(`   - ${produtosComUmContrato.length} produtos`);
      
      let valorTotal = 0;
      produtosComUmContrato.forEach(p => {
        const contrato = p.contratos[0];
        const valor = Number(p.quantidade_total) * Number(contrato.preco);
        valorTotal += valor;
        console.log(`   - ${p.produto_nome}: ${Number(p.quantidade_total).toFixed(2)} kg × R$ ${Number(contrato.preco).toFixed(2)} = R$ ${valor.toFixed(2)}`);
      });
      
      console.log('');
      console.log(`💰 Valor total estimado: R$ ${valorTotal.toFixed(2)}`);
      console.log('');
      console.log('⚠️  NOTA: Este é apenas um teste. Nenhum pedido foi criado.');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

testarGerarPedido();
