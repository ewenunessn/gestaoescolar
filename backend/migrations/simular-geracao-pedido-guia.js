require('dotenv').config({ path: 'backend/.env' });
const { Pool } = require('pg');

// Usar NEON para produção
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function simular() {
  const client = await pool.connect();
  try {
    console.log('🧪 Simulando geração de pedido da guia (NEON)...\n');

    // 1. Buscar uma guia aberta
    const guiasResult = await client.query(`
      SELECT id, nome, competencia_mes_ano, status
      FROM guias
      WHERE status = 'aberta'
      ORDER BY id DESC
      LIMIT 1
    `);

    if (guiasResult.rows.length === 0) {
      console.log('❌ Nenhuma guia aberta encontrada');
      return;
    }

    const guia = guiasResult.rows[0];
    console.log(`✅ Guia encontrada: #${guia.id} - ${guia.nome || guia.competencia_mes_ano}`);
    console.log(`   Status: ${guia.status}\n`);

    // 2. Buscar itens da guia
    const itensResult = await client.query(`
      SELECT 
        gpe.produto_id,
        p.nome as produto_nome,
        COUNT(DISTINCT gpe.escola_id) as num_escolas,
        SUM(gpe.quantidade) as quantidade_total
      FROM guia_produto_escola gpe
      INNER JOIN produtos p ON p.id = gpe.produto_id
      WHERE gpe.guia_id = $1
      GROUP BY gpe.produto_id, p.nome
      ORDER BY p.nome
    `, [guia.id]);

    console.log(`📦 ${itensResult.rows.length} produto(s) na guia:\n`);
    itensResult.rows.forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.produto_nome}`);
      console.log(`   Quantidade: ${parseFloat(item.quantidade_total).toFixed(2)} kg`);
      console.log(`   Escolas: ${item.num_escolas}`);
    });

    // 3. Para cada produto, verificar contratos disponíveis
    console.log('\n🔍 Verificando contratos disponíveis...\n');

    const produtoIds = itensResult.rows.map(r => r.produto_id);
    
    const contratosResult = await client.query(`
      SELECT 
        cp.produto_id,
        p.nome as produto_nome,
        cp.id as contrato_produto_id,
        c.id as contrato_id,
        c.numero as contrato_numero,
        f.nome as fornecedor_nome,
        cp.preco_unitario,
        COALESCE(
          (SELECT SUM(cpm.quantidade_inicial - cpm.quantidade_consumida)
           FROM contrato_produtos_modalidades cpm
           WHERE cpm.contrato_produto_id = cp.id AND cpm.ativo = true),
          cp.quantidade_contratada
        ) as saldo_disponivel
      FROM contrato_produtos cp
      INNER JOIN contratos c ON c.id = cp.contrato_id
      INNER JOIN fornecedores f ON f.id = c.fornecedor_id
      INNER JOIN produtos p ON p.id = cp.produto_id
      WHERE cp.produto_id = ANY($1) 
        AND cp.ativo = true
        AND c.status = 'ativo' 
        AND c.data_fim >= CURRENT_DATE
      ORDER BY cp.produto_id, c.data_fim ASC
    `, [produtoIds]);

    // Agrupar contratos por produto
    const contratosPorProduto = new Map();
    for (const row of contratosResult.rows) {
      if (!contratosPorProduto.has(row.produto_id)) {
        contratosPorProduto.set(row.produto_id, []);
      }
      contratosPorProduto.get(row.produto_id).push(row);
    }

    // Identificar produtos com múltiplos contratos
    const produtosMultiplos = [];
    const produtosSemContrato = [];
    const produtosUmContrato = [];

    for (const item of itensResult.rows) {
      const contratos = contratosPorProduto.get(item.produto_id) || [];
      
      if (contratos.length === 0) {
        produtosSemContrato.push(item.produto_nome);
      } else if (contratos.length === 1) {
        produtosUmContrato.push({
          nome: item.produto_nome,
          contrato: contratos[0].contrato_numero,
          fornecedor: contratos[0].fornecedor_nome
        });
      } else {
        produtosMultiplos.push({
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          quantidade_necessaria: parseFloat(item.quantidade_total),
          contratos: contratos.map(c => ({
            contrato_produto_id: c.contrato_produto_id,
            contrato_numero: c.contrato_numero,
            fornecedor_nome: c.fornecedor_nome,
            preco_unitario: parseFloat(c.preco_unitario),
            saldo_disponivel: parseFloat(c.saldo_disponivel)
          }))
        });
      }
    }

    console.log('📊 RESULTADO DA ANÁLISE:\n');
    
    if (produtosSemContrato.length > 0) {
      console.log(`❌ ${produtosSemContrato.length} produto(s) SEM contrato:`);
      produtosSemContrato.forEach(p => console.log(`   - ${p}`));
      console.log('');
    }

    if (produtosUmContrato.length > 0) {
      console.log(`✅ ${produtosUmContrato.length} produto(s) com 1 contrato (automático):`);
      produtosUmContrato.forEach(p => {
        console.log(`   - ${p.nome}`);
        console.log(`     Contrato: ${p.contrato} (${p.fornecedor})`);
      });
      console.log('');
    }

    if (produtosMultiplos.length > 0) {
      console.log(`⚠️  ${produtosMultiplos.length} produto(s) em MÚLTIPLOS contratos:\n`);
      
      produtosMultiplos.forEach((prod, idx) => {
        console.log(`${idx + 1}. ${prod.produto_nome}`);
        console.log(`   Quantidade necessária: ${prod.quantidade_necessaria.toFixed(2)} kg`);
        console.log(`   Contratos disponíveis:`);
        
        prod.contratos.forEach((c, cIdx) => {
          console.log(`   ${cIdx + 1}. ${c.contrato_numero} - ${c.fornecedor_nome}`);
          console.log(`      Preço: R$ ${c.preco_unitario.toFixed(2)}/kg`);
          console.log(`      Saldo: ${c.saldo_disponivel.toFixed(2)} kg`);
        });
        console.log('');
      });

      console.log('🎯 AÇÃO ESPERADA:');
      console.log('   O backend deve retornar:');
      console.log('   {');
      console.log('     requer_selecao: true,');
      console.log('     produtos_multiplos_contratos: [...]');
      console.log('   }');
      console.log('');
      console.log('   O frontend deve:');
      console.log('   1. Detectar requer_selecao: true');
      console.log('   2. Abrir o dialog SelecionarContratosDialog');
      console.log('   3. Mostrar os produtos para seleção');
      console.log('');
      
      // Simular a resposta do backend
      console.log('📤 RESPOSTA SIMULADA DO BACKEND:');
      console.log(JSON.stringify({
        requer_selecao: true,
        produtos_multiplos_contratos: produtosMultiplos,
        mensagem: `${produtosMultiplos.length} produto(s) encontrado(s) em múltiplos contratos. Selecione qual contrato usar para cada produto.`
      }, null, 2));
      
    } else {
      console.log('✅ Nenhum produto em múltiplos contratos');
      console.log('   O pedido seria gerado automaticamente');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

simular();
