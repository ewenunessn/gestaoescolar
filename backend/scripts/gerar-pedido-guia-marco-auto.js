require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

// Usar DATABASE_URL do Neon (mesmo do backend)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function gerarPedidoAutomatico() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Gerando pedido da guia de março AUTOMATICAMENTE...\n');
    
    await client.query('BEGIN');
    
    // 1. Buscar guia de março
    const guiaResult = await client.query(`
      SELECT id, mes, ano, competencia_mes_ano, nome 
      FROM guias 
      WHERE competencia_mes_ano = '2026-03'
      LIMIT 1
    `);
    
    if (guiaResult.rows.length === 0) {
      console.log('❌ Guia não encontrada');
      await client.query('ROLLBACK');
      return;
    }
    
    const guia = guiaResult.rows[0];
    const guia_id = guia.id;
    const competencia = guia.competencia_mes_ano;
    const [ano, mes] = competencia.split('-').map(Number);
    const meses = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
    const mesAbrev = meses[mes - 1];
    
    console.log('📋 Guia:', guia.nome);
    console.log('');
    
    // 2. Buscar itens da guia
    const itensResult = await client.query(`
      SELECT
        gpe.id as item_id,
        gpe.produto_id,
        gpe.escola_id,
        gpe.quantidade,
        gpe.unidade,
        gpe.data_entrega,
        p.nome as produto_nome,
        p.perecivel,
        e.nome as escola_nome
      FROM guia_produto_escola gpe
      JOIN produtos p ON p.id = gpe.produto_id
      JOIN escolas e ON e.id = gpe.escola_id
      WHERE gpe.guia_id = $1 AND gpe.quantidade > 0
      ORDER BY gpe.produto_id, gpe.data_entrega, gpe.escola_id
    `, [guia_id]);
    
    console.log(`📦 Total de itens: ${itensResult.rows.length}`);
    console.log('');
    
    // 3. Agrupar por produto
    const grupos = new Map();
    
    for (const row of itensResult.rows) {
      const dataKey = row.data_entrega ? new Date(row.data_entrega).toISOString().split('T')[0] : null;
      const key = row.perecivel ? `${row.produto_id}__${dataKey ?? ''}` : `${row.produto_id}__np`;
      
      if (!grupos.has(key)) {
        grupos.set(key, {
          produto_id: row.produto_id,
          produto_nome: row.produto_nome,
          perecivel: row.perecivel,
          data_entrega: row.perecivel ? dataKey : null,
          escolas: [],
        });
      }
      
      const g = grupos.get(key);
      const existente = g.escolas.find(e => e.escola_id === row.escola_id);
      if (existente) {
        existente.quantidade += Number(row.quantidade);
      } else {
        g.escolas.push({ 
          escola_id: row.escola_id, 
          escola_nome: row.escola_nome, 
          quantidade: Number(row.quantidade) 
        });
      }
      
      if (!row.perecivel && dataKey) {
        if (!g.data_entrega || dataKey < g.data_entrega) {
          g.data_entrega = dataKey;
        }
      }
    }
    
    // 4. Buscar contratos (escolher o mais barato automaticamente)
    const todosProdutoIds = [...new Set(itensResult.rows.map(r => r.produto_id))];
    const contratosResult = await client.query(`
      SELECT 
        cp.id as contrato_produto_id, 
        cp.produto_id, 
        cp.preco_unitario,
        cp.peso_embalagem,
        cp.unidade_compra,
        cp.fator_conversao,
        c.id as contrato_id,
        c.numero as contrato_numero,
        f.id as fornecedor_id,
        f.nome as fornecedor_nome,
        p.peso as peso_distribuicao,
        p.unidade_distribuicao,
        COALESCE(
          (SELECT SUM(cpm2.quantidade_disponivel) 
           FROM contrato_produtos_modalidades cpm2 
           WHERE cpm2.contrato_produto_id = cp.id AND cpm2.ativo = true),
          cp.quantidade_contratada
        ) as saldo_disponivel,
        ROW_NUMBER() OVER (PARTITION BY cp.produto_id ORDER BY cp.preco_unitario ASC) as rn
      FROM contrato_produtos cp
      JOIN contratos c ON c.id = cp.contrato_id
      JOIN fornecedores f ON f.id = c.fornecedor_id
      JOIN produtos p ON p.id = cp.produto_id
      WHERE cp.produto_id = ANY($1) AND cp.ativo = true
        AND c.status = 'ativo' AND c.data_fim >= CURRENT_DATE
    `, [todosProdutoIds]);
    
    // Pegar apenas o mais barato de cada produto (rn = 1)
    const contratosPorProduto = new Map();
    for (const row of contratosResult.rows) {
      if (row.rn === '1' || Number(row.rn) === 1) {
        contratosPorProduto.set(row.produto_id, row);
      }
    }
    
    console.log('📊 Contratos selecionados (mais baratos):');
    for (const [produto_id, contrato] of contratosPorProduto) {
      console.log(`   - Produto ${produto_id}: ${contrato.fornecedor_nome} (R$ ${Number(contrato.preco_unitario).toFixed(2)})`);
    }
    console.log('');
    
    // 5. Filtrar grupos com contrato
    const gruposComContrato = new Map();
    const produtosSemContrato = [];
    
    for (const [key, grupo] of grupos) {
      if (contratosPorProduto.has(grupo.produto_id)) {
        gruposComContrato.set(key, grupo);
      } else {
        produtosSemContrato.push(grupo.produto_nome);
      }
    }
    
    if (produtosSemContrato.length > 0) {
      console.log('⚠️  Produtos sem contrato (ignorados):', produtosSemContrato.join(', '));
      console.log('');
    }
    
    if (gruposComContrato.size === 0) {
      console.log('❌ Nenhum produto com contrato');
      await client.query('ROLLBACK');
      return;
    }
    
    // 6. Criar pedido
    const maxResult = await client.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM LENGTH(numero) - 5) AS INTEGER)), 0) as max_seq
      FROM pedidos WHERE competencia_mes_ano = $1
    `, [competencia]);
    const seq = (parseInt(maxResult.rows[0].max_seq) + 1).toString().padStart(6, '0');
    const numero = `PED-${mesAbrev}${ano}${seq}`;
    
    const obsTexto = [
      `Gerado automaticamente da Guia #${guia_id} (${guia.nome})`,
      `Contratos selecionados: mais barato`,
      produtosSemContrato.length > 0 ? `Sem contrato: ${produtosSemContrato.join(', ')}` : null,
    ].filter(Boolean).join(' | ');
    
    const pedidoResult = await client.query(`
      INSERT INTO pedidos (numero, data_pedido, status, valor_total, observacoes, usuario_criacao_id, competencia_mes_ano, guia_id)
      VALUES ($1, CURRENT_DATE, 'pendente', 0, $2, 1, $3, $4)
      RETURNING id
    `, [numero, obsTexto, competencia, guia_id]);
    
    const pedido_id = pedidoResult.rows[0].id;
    console.log(`📝 Pedido criado: ${numero} (ID: ${pedido_id})`);
    console.log('');
    
    // 7. Inserir itens
    let totalItens = 0;
    let valorTotalPedido = 0;
    
    for (const grupo of gruposComContrato.values()) {
      const contrato = contratosPorProduto.get(grupo.produto_id);
      const qtdTotalKg = grupo.escolas.reduce((s, e) => s + e.quantidade, 0);
      
      // Conversão simples (sem função helper por enquanto)
      const quantidade_compra = qtdTotalKg;
      const unidade_compra = 'kg';
      const quantidade_kg = qtdTotalKg;
      const quantidade_distribuicao = qtdTotalKg;
      const unidade_distribuicao = contrato.unidade_distribuicao || 'kg';
      
      const preco = Number(contrato.preco_unitario);
      const valorTotal = quantidade_compra * preco;
      valorTotalPedido += valorTotal;
      
      const dataEntrega = grupo.data_entrega || new Date().toISOString().split('T')[0];
      
      const itemResult = await client.query(`
        INSERT INTO pedido_itens (
          pedido_id, contrato_produto_id, produto_id,
          quantidade, unidade, quantidade_kg,
          quantidade_distribuicao, unidade_distribuicao,
          preco_unitario, valor_total, data_entrega_prevista, observacoes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `, [
        pedido_id, 
        contrato.contrato_produto_id, 
        grupo.produto_id, 
        quantidade_compra,
        unidade_compra,
        quantidade_kg,
        quantidade_distribuicao,
        unidade_distribuicao,
        preco, 
        valorTotal,
        dataEntrega, 
        `Guia #${guia_id} - ${contrato.fornecedor_nome}`
      ]);
      
      const pedido_item_id = itemResult.rows[0].id;
      
      // Programação
      const progResult = await client.query(`
        INSERT INTO pedido_item_programacoes (pedido_item_id, data_entrega, observacoes)
        VALUES ($1, $2, $3) RETURNING id
      `, [pedido_item_id, dataEntrega, `Guia #${guia_id}`]);
      
      const programacao_id = progResult.rows[0].id;
      
      // Escolas
      for (const esc of grupo.escolas) {
        if (esc.quantidade > 0) {
          await client.query(`
            INSERT INTO pedido_item_programacao_escolas (programacao_id, escola_id, quantidade)
            VALUES ($1, $2, $3)
          `, [programacao_id, esc.escola_id, Math.round(esc.quantidade * 1000) / 1000]);
        }
      }
      
      totalItens++;
      console.log(`   ✅ ${grupo.produto_nome}: ${qtdTotalKg.toFixed(2)} kg × R$ ${preco.toFixed(2)} = R$ ${valorTotal.toFixed(2)}`);
    }
    
    // 8. Atualizar valor total
    await client.query(`
      UPDATE pedidos
      SET valor_total = $1, updated_at = NOW()
      WHERE id = $2
    `, [valorTotalPedido, pedido_id]);
    
    await client.query('COMMIT');
    
    console.log('');
    console.log('✅ PEDIDO GERADO COM SUCESSO!');
    console.log(`   Número: ${numero}`);
    console.log(`   Itens: ${totalItens}`);
    console.log(`   Valor Total: R$ ${valorTotalPedido.toFixed(2)}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

gerarPedidoAutomatico();
