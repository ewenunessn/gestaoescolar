const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function verificarConsistencia() {
  await client.connect();
  console.log('✅ Conectado ao Neon\n');
  console.log('🔍 VERIFICAÇÃO DE CONSISTÊNCIA DE DADOS\n');
  console.log('='.repeat(70) + '\n');

  const problemas = [];
  const avisos = [];

  try {
    // 1. VERIFICAR FOREIGN KEYS ÓRFÃS
    console.log('📋 1. Verificando Foreign Keys órfãs...\n');

    // Contrato_produtos sem contrato
    const contratosProdutosOrfaos = await client.query(`
      SELECT cp.id, cp.contrato_id, cp.produto_id
      FROM contrato_produtos cp
      LEFT JOIN contratos c ON cp.contrato_id = c.id
      WHERE c.id IS NULL
    `);
    if (contratosProdutosOrfaos.rows.length > 0) {
      problemas.push(`❌ ${contratosProdutosOrfaos.rows.length} produtos de contrato sem contrato associado`);
      contratosProdutosOrfaos.rows.forEach(r => {
        console.log(`   - Produto contrato ID ${r.id}: contrato_id ${r.contrato_id} não existe`);
      });
    } else {
      console.log('   ✅ Todos os produtos de contrato têm contrato válido');
    }

    // Contrato_produtos sem produto
    const contratosProdutosSemProduto = await client.query(`
      SELECT cp.id, cp.contrato_id, cp.produto_id
      FROM contrato_produtos cp
      LEFT JOIN produtos p ON cp.produto_id = p.id
      WHERE p.id IS NULL
    `);
    if (contratosProdutosSemProduto.rows.length > 0) {
      problemas.push(`❌ ${contratosProdutosSemProduto.rows.length} produtos de contrato sem produto associado`);
      contratosProdutosSemProduto.rows.forEach(r => {
        console.log(`   - Produto contrato ID ${r.id}: produto_id ${r.produto_id} não existe`);
      });
    } else {
      console.log('   ✅ Todos os produtos de contrato têm produto válido');
    }

    // Contratos sem fornecedor
    const contratosSemFornecedor = await client.query(`
      SELECT c.id, c.numero, c.fornecedor_id
      FROM contratos c
      LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE f.id IS NULL
    `);
    if (contratosSemFornecedor.rows.length > 0) {
      problemas.push(`❌ ${contratosSemFornecedor.rows.length} contratos sem fornecedor associado`);
      contratosSemFornecedor.rows.forEach(r => {
        console.log(`   - Contrato ${r.numero} (ID ${r.id}): fornecedor_id ${r.fornecedor_id} não existe`);
      });
    } else {
      console.log('   ✅ Todos os contratos têm fornecedor válido');
    }

    // 2. VERIFICAR DADOS INVÁLIDOS
    console.log('\n📋 2. Verificando dados inválidos...\n');

    // Produtos com preço negativo ou zero
    const produtosPrecoInvalido = await client.query(`
      SELECT cp.id, c.numero as contrato, p.nome as produto, cp.preco_unitario
      FROM contrato_produtos cp
      JOIN contratos c ON cp.contrato_id = c.id
      JOIN produtos p ON cp.produto_id = p.id
      WHERE cp.preco_unitario <= 0
    `);
    if (produtosPrecoInvalido.rows.length > 0) {
      problemas.push(`❌ ${produtosPrecoInvalido.rows.length} produtos com preço inválido (≤ 0)`);
      produtosPrecoInvalido.rows.forEach(r => {
        console.log(`   - Contrato ${r.contrato}: ${r.produto} com preço R$ ${r.preco_unitario}`);
      });
    } else {
      console.log('   ✅ Todos os produtos têm preço válido');
    }

    // Produtos com quantidade negativa ou zero
    const produtosQtdInvalida = await client.query(`
      SELECT cp.id, c.numero as contrato, p.nome as produto, cp.quantidade_contratada
      FROM contrato_produtos cp
      JOIN contratos c ON cp.contrato_id = c.id
      JOIN produtos p ON cp.produto_id = p.id
      WHERE cp.quantidade_contratada <= 0
    `);
    if (produtosQtdInvalida.rows.length > 0) {
      problemas.push(`❌ ${produtosQtdInvalida.rows.length} produtos com quantidade inválida (≤ 0)`);
      produtosQtdInvalida.rows.forEach(r => {
        console.log(`   - Contrato ${r.contrato}: ${r.produto} com quantidade ${r.quantidade_contratada}`);
      });
    } else {
      console.log('   ✅ Todos os produtos têm quantidade válida');
    }

    // Contratos com data fim antes da data início
    const contratosDatasInvalidas = await client.query(`
      SELECT id, numero, data_inicio, data_fim
      FROM contratos
      WHERE data_fim < data_inicio
    `);
    if (contratosDatasInvalidas.rows.length > 0) {
      problemas.push(`❌ ${contratosDatasInvalidas.rows.length} contratos com datas inválidas`);
      contratosDatasInvalidas.rows.forEach(r => {
        console.log(`   - Contrato ${r.numero}: início ${r.data_inicio} > fim ${r.data_fim}`);
      });
    } else {
      console.log('   ✅ Todos os contratos têm datas válidas');
    }

    // 3. VERIFICAR DUPLICAÇÕES
    console.log('\n📋 3. Verificando duplicações...\n');

    // Produtos duplicados no mesmo contrato
    const produtosDuplicados = await client.query(`
      SELECT c.numero as contrato, p.nome as produto, COUNT(*) as vezes
      FROM contrato_produtos cp
      JOIN contratos c ON cp.contrato_id = c.id
      JOIN produtos p ON cp.produto_id = p.id
      GROUP BY c.numero, p.nome, cp.contrato_id, cp.produto_id
      HAVING COUNT(*) > 1
    `);
    if (produtosDuplicados.rows.length > 0) {
      problemas.push(`❌ ${produtosDuplicados.rows.length} produtos duplicados em contratos`);
      produtosDuplicados.rows.forEach(r => {
        console.log(`   - Contrato ${r.contrato}: ${r.produto} aparece ${r.vezes} vezes`);
      });
    } else {
      console.log('   ✅ Não há produtos duplicados nos contratos');
    }

    // Fornecedores com mesmo nome
    const fornecedoresDuplicados = await client.query(`
      SELECT nome, COUNT(*) as vezes
      FROM fornecedores
      GROUP BY nome
      HAVING COUNT(*) > 1
    `);
    if (fornecedoresDuplicados.rows.length > 0) {
      avisos.push(`⚠️  ${fornecedoresDuplicados.rows.length} fornecedores com nomes similares`);
      fornecedoresDuplicados.rows.forEach(r => {
        console.log(`   - "${r.nome}" aparece ${r.vezes} vezes`);
      });
    } else {
      console.log('   ✅ Não há fornecedores duplicados');
    }

    // 4. VERIFICAR INTEGRIDADE REFERENCIAL
    console.log('\n📋 4. Verificando integridade referencial...\n');

    // Verificar se há pedidos/compras usando produtos de contratos
    const produtosEmUso = await client.query(`
      SELECT COUNT(DISTINCT cp.id) as total
      FROM contrato_produtos cp
      WHERE EXISTS (
        SELECT 1 FROM pedido_itens pi WHERE pi.contrato_produto_id = cp.id
      )
    `);
    console.log(`   ℹ️  ${produtosEmUso.rows[0].total} produtos de contrato estão sendo usados em pedidos`);

    // Verificar contratos sem produtos
    const contratosSemProdutos = await client.query(`
      SELECT c.id, c.numero, f.nome as fornecedor
      FROM contratos c
      JOIN fornecedores f ON c.fornecedor_id = f.id
      LEFT JOIN contrato_produtos cp ON c.id = cp.contrato_id
      WHERE cp.id IS NULL
    `);
    if (contratosSemProdutos.rows.length > 0) {
      avisos.push(`⚠️  ${contratosSemProdutos.rows.length} contratos sem produtos`);
      contratosSemProdutos.rows.forEach(r => {
        console.log(`   - Contrato ${r.numero} (${r.fornecedor}) não tem produtos`);
      });
    } else {
      console.log('   ✅ Todos os contratos têm produtos');
    }

    // 5. VERIFICAR CONSTRAINTS CASCADE
    console.log('\n📋 5. Verificando constraints CASCADE...\n');

    const constraints = await client.query(`
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('contrato_produtos', 'contratos', 'pedido_itens')
      ORDER BY tc.table_name, kcu.column_name
    `);

    const semCascade = constraints.rows.filter(c => c.delete_rule !== 'CASCADE');
    if (semCascade.length > 0) {
      avisos.push(`⚠️  ${semCascade.length} foreign keys sem CASCADE`);
      semCascade.forEach(c => {
        console.log(`   - ${c.table_name}.${c.column_name} → ${c.foreign_table_name} (${c.delete_rule})`);
      });
    } else {
      console.log('   ✅ Todas as foreign keys importantes têm CASCADE');
    }

    // RESUMO
    console.log('\n' + '='.repeat(70));
    console.log('📊 RESUMO DA VERIFICAÇÃO');
    console.log('='.repeat(70) + '\n');

    if (problemas.length === 0 && avisos.length === 0) {
      console.log('✅ NENHUM PROBLEMA ENCONTRADO!');
      console.log('   Todos os dados estão consistentes e íntegros.\n');
    } else {
      if (problemas.length > 0) {
        console.log('❌ PROBLEMAS CRÍTICOS ENCONTRADOS:\n');
        problemas.forEach(p => console.log(`   ${p}`));
        console.log('');
      }

      if (avisos.length > 0) {
        console.log('⚠️  AVISOS (não críticos):\n');
        avisos.forEach(a => console.log(`   ${a}`));
        console.log('');
      }
    }

    // RECOMENDAÇÕES
    console.log('💡 RECOMENDAÇÕES:\n');
    console.log('   1. Faça backup regular do banco de dados');
    console.log('   2. Mantenha as constraints CASCADE ativas');
    console.log('   3. Valide dados antes de inserir (frontend + backend)');
    console.log('   4. Monitore logs de erro do sistema');
    console.log('   5. Execute esta verificação periodicamente\n');

  } catch (error) {
    console.error('\n❌ ERRO durante verificação:', error);
  } finally {
    await client.end();
    console.log('🔌 Conexão fechada\n');
  }
}

verificarConsistencia().catch(console.error);
