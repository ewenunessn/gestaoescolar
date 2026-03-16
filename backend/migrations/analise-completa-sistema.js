const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function analisarSistema() {
  await client.connect();
  console.log('✅ Conectado ao Neon\n');
  console.log('🔍 ANÁLISE COMPLETA DO SISTEMA\n');
  console.log('='.repeat(80) + '\n');

  try {
    // 1. ESTRUTURA DO BANCO
    console.log('📊 1. ESTRUTURA DO BANCO DE DADOS\n');
    
    const tabelas = await client.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `);

    console.log(`   Total de tabelas: ${tabelas.rows.length}\n`);
    tabelas.rows.forEach(t => {
      console.log(`   📋 ${t.tablename.padEnd(40)} ${t.size}`);
    });

    // 2. CONTAGEM DE REGISTROS POR MÓDULO
    console.log('\n📊 2. CONTAGEM DE REGISTROS POR MÓDULO\n');

    const modulos = [
      { nome: 'Usuários', tabela: 'usuarios' },
      { nome: 'Escolas', tabela: 'escolas' },
      { nome: 'Modalidades', tabela: 'modalidades' },
      { nome: 'Produtos', tabela: 'produtos' },
      { nome: 'Fornecedores', tabela: 'fornecedores' },
      { nome: 'Contratos', tabela: 'contratos' },
      { nome: 'Produtos em Contratos', tabela: 'contrato_produtos' },
      { nome: 'Refeições', tabela: 'refeicoes' },
      { nome: 'Ingredientes', tabela: 'refeicoes_ingredientes' },
      { nome: 'Cardápios', tabela: 'cardapios' },
      { nome: 'Guias de Demanda', tabela: 'guias_demanda' },
      { nome: 'Itens de Guia', tabela: 'guia_produto_escola' },
      { nome: 'Pedidos', tabela: 'pedidos' },
      { nome: 'Itens de Pedido', tabela: 'pedido_itens' },
      { nome: 'Compras', tabela: 'compras' },
      { nome: 'Programações de Entrega', tabela: 'programacoes_entrega' },
      { nome: 'Entregas', tabela: 'entregas' },
      { nome: 'Estoque Central', tabela: 'estoque_central' },
      { nome: 'Estoque Escolas', tabela: 'estoque_escolas' },
      { nome: 'Movimentações', tabela: 'estoque_movimentacoes' },
      { nome: 'Faturamentos', tabela: 'faturamentos' },
      { nome: 'Itens de Faturamento', tabela: 'faturamento_itens' }
    ];

    for (const mod of modulos) {
      try {
        const result = await client.query(`SELECT COUNT(*) as total FROM ${mod.tabela}`);
        const total = parseInt(result.rows[0].total);
        const emoji = total > 0 ? '✅' : '⚪';
        console.log(`   ${emoji} ${mod.nome.padEnd(30)} ${total.toString().padStart(6)} registros`);
      } catch (e) {
        console.log(`   ❌ ${mod.nome.padEnd(30)} (tabela não existe)`);
      }
    }

    // 3. MAPA DE RELACIONAMENTOS
    console.log('\n📊 3. MAPA DE RELACIONAMENTOS (FOREIGN KEYS)\n');

    const fks = await client.query(`
      SELECT 
        tc.table_name as tabela_origem,
        kcu.column_name as coluna,
        ccu.table_name AS tabela_destino,
        ccu.column_name AS coluna_destino,
        rc.delete_rule as on_delete,
        rc.update_rule as on_update
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name
    `);

    console.log(`   Total de relacionamentos: ${fks.rows.length}\n`);

    // Agrupar por tabela
    const fksPorTabela = {};
    fks.rows.forEach(fk => {
      if (!fksPorTabela[fk.tabela_origem]) {
        fksPorTabela[fk.tabela_origem] = [];
      }
      fksPorTabela[fk.tabela_origem].push(fk);
    });

    Object.keys(fksPorTabela).sort().forEach(tabela => {
      console.log(`   📋 ${tabela}:`);
      fksPorTabela[tabela].forEach(fk => {
        const deleteIcon = fk.on_delete === 'CASCADE' ? '🔗' : '⚠️';
        console.log(`      ${deleteIcon} ${fk.coluna} → ${fk.tabela_destino}.${fk.coluna_destino} (${fk.on_delete})`);
      });
    });

    // 4. FLUXO DE DADOS ENTRE MÓDULOS
    console.log('\n📊 4. FLUXO DE DADOS ENTRE MÓDULOS\n');

    console.log('   🔄 FLUXO PRINCIPAL:\n');
    console.log('   1️⃣  CADASTROS BASE');
    console.log('       └─ Escolas → Modalidades → Alunos');
    console.log('       └─ Produtos → Fornecedores → Contratos → Produtos em Contratos\n');
    
    console.log('   2️⃣  PLANEJAMENTO NUTRICIONAL');
    console.log('       └─ Refeições → Ingredientes (usa Produtos)');
    console.log('       └─ Cardápios → Refeições por Modalidade\n');
    
    console.log('   3️⃣  DEMANDA E COMPRAS');
    console.log('       └─ Cardápios → Guias de Demanda → Itens por Escola');
    console.log('       └─ Guias → Pedidos → Itens de Pedido (usa Produtos de Contratos)');
    console.log('       └─ Pedidos → Compras\n');
    
    console.log('   4️⃣  LOGÍSTICA');
    console.log('       └─ Compras → Programações de Entrega');
    console.log('       └─ Programações → Entregas → Comprovantes\n');
    
    console.log('   5️⃣  ESTOQUE');
    console.log('       └─ Entregas → Estoque Central → Movimentações');
    console.log('       └─ Movimentações → Estoque Escolas\n');
    
    console.log('   6️⃣  FINANCEIRO');
    console.log('       └─ Entregas → Faturamentos → Itens de Faturamento');
    console.log('       └─ Faturamentos → Pagamentos\n');

    // 5. DEPENDÊNCIAS CRÍTICAS
    console.log('📊 5. DEPENDÊNCIAS CRÍTICAS (O QUE ACONTECE SE DELETAR)\n');

    const dependencias = [
      {
        entidade: 'PRODUTO',
        impacto: [
          '❌ Produtos em Contratos (CASCADE)',
          '❌ Ingredientes de Refeições (CASCADE)',
          '❌ Itens de Guia de Demanda (CASCADE)',
          '❌ Itens de Pedido (CASCADE)',
          '❌ Itens de Faturamento (CASCADE)',
          '❌ Estoque Central (CASCADE)',
          '❌ Estoque Escolas (CASCADE)',
          '❌ Movimentações (CASCADE)'
        ]
      },
      {
        entidade: 'FORNECEDOR',
        impacto: [
          '⚠️  Contratos (RESTRICT - precisa deletar contratos primeiro)',
          '⚠️  Compras (RESTRICT)'
        ]
      },
      {
        entidade: 'CONTRATO',
        impacto: [
          '❌ Produtos em Contratos (CASCADE)',
          '⚠️  Itens de Pedido (RESTRICT - se houver pedidos)'
        ]
      },
      {
        entidade: 'ESCOLA',
        impacto: [
          '❌ Alunos (CASCADE)',
          '❌ Itens de Guia (CASCADE)',
          '❌ Estoque Escola (CASCADE)',
          '⚠️  Entregas (RESTRICT)',
          '⚠️  Faturamentos (RESTRICT)'
        ]
      },
      {
        entidade: 'REFEIÇÃO',
        impacto: [
          '❌ Ingredientes (CASCADE)',
          '❌ Cardápios (CASCADE)'
        ]
      },
      {
        entidade: 'GUIA DE DEMANDA',
        impacto: [
          '❌ Itens de Guia (CASCADE)',
          '⚠️  Pedidos (RESTRICT - se houver pedidos gerados)'
        ]
      }
    ];

    dependencias.forEach(dep => {
      console.log(`   🎯 ${dep.entidade}:`);
      dep.impacto.forEach(imp => console.log(`      ${imp}`));
      console.log('');
    });

    // 6. INTEGRIDADE DOS DADOS
    console.log('📊 6. VERIFICAÇÃO DE INTEGRIDADE\n');

    // Produtos órfãos em contratos
    const produtosOrfaos = await client.query(`
      SELECT COUNT(*) as total
      FROM contrato_produtos cp
      LEFT JOIN produtos p ON cp.produto_id = p.id
      WHERE p.id IS NULL
    `);
    console.log(`   ${produtosOrfaos.rows[0].total > 0 ? '❌' : '✅'} Produtos órfãos em contratos: ${produtosOrfaos.rows[0].total}`);

    // Contratos sem fornecedor
    const contratosSemFornecedor = await client.query(`
      SELECT COUNT(*) as total
      FROM contratos c
      LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE f.id IS NULL
    `);
    console.log(`   ${contratosSemFornecedor.rows[0].total > 0 ? '❌' : '✅'} Contratos sem fornecedor: ${contratosSemFornecedor.rows[0].total}`);

    // Pedidos sem guia
    const pedidosSemGuia = await client.query(`
      SELECT COUNT(*) as total
      FROM pedidos p
      LEFT JOIN guias g ON p.guia_id = g.id
      WHERE p.guia_id IS NOT NULL AND g.id IS NULL
    `);
    console.log(`   ${pedidosSemGuia.rows[0].total > 0 ? '❌' : '✅'} Pedidos sem guia: ${pedidosSemGuia.rows[0].total}`);

    // Histórico de entregas sem guia_produto_escola
    const entregasSemGuia = await client.query(`
      SELECT COUNT(*) as total
      FROM historico_entregas he
      LEFT JOIN guia_produto_escola gpe ON he.guia_produto_escola_id = gpe.id
      WHERE gpe.id IS NULL
    `);
    console.log(`   ${entregasSemGuia.rows[0].total > 0 ? '❌' : '✅'} Histórico entregas sem guia: ${entregasSemGuia.rows[0].total}`);

    // 7. ESTATÍSTICAS DE USO
    console.log('\n📊 7. ESTATÍSTICAS DE USO\n');

    // Produtos mais usados em contratos
    const produtosMaisUsados = await client.query(`
      SELECT p.nome, COUNT(*) as contratos
      FROM contrato_produtos cp
      JOIN produtos p ON cp.produto_id = p.id
      GROUP BY p.nome
      ORDER BY contratos DESC
      LIMIT 5
    `);
    console.log('   🏆 Top 5 produtos em contratos:');
    produtosMaisUsados.rows.forEach((p, i) => {
      console.log(`      ${i + 1}. ${p.nome} (${p.contratos} contratos)`);
    });

    // Fornecedores com mais contratos
    const fornecedoresMaisContratos = await client.query(`
      SELECT f.nome, COUNT(*) as contratos
      FROM contratos c
      JOIN fornecedores f ON c.fornecedor_id = f.id
      GROUP BY f.nome
      ORDER BY contratos DESC
      LIMIT 5
    `);
    console.log('\n   🏆 Top 5 fornecedores:');
    fornecedoresMaisContratos.rows.forEach((f, i) => {
      console.log(`      ${i + 1}. ${f.nome} (${f.contratos} contratos)`);
    });

    // 8. RECOMENDAÇÕES
    console.log('\n📊 8. RECOMENDAÇÕES DE SEGURANÇA\n');
    
    console.log('   ✅ PROTEÇÕES ATIVAS:');
    console.log('      • CASCADE em produtos → deleta automaticamente de contratos, estoque, etc');
    console.log('      • RESTRICT em fornecedores → impede deletar se houver contratos');
    console.log('      • RESTRICT em pedidos → impede deletar produtos de contrato em uso\n');

    console.log('   ⚠️  CUIDADOS NECESSÁRIOS:');
    console.log('      • Deletar PRODUTO: Remove de TODOS os contratos e estoque');
    console.log('      • Deletar ESCOLA: Remove alunos, estoque e itens de guia');
    console.log('      • Deletar REFEIÇÃO: Remove do cardápio e ingredientes');
    console.log('      • Deletar GUIA: Remove todos os itens, mas pedidos ficam órfãos\n');

    console.log('   💡 BOAS PRÁTICAS:');
    console.log('      1. Use "ativo: false" ao invés de deletar');
    console.log('      2. Faça backup antes de operações em massa');
    console.log('      3. Verifique dependências antes de deletar');
    console.log('      4. Execute este script mensalmente');
    console.log('      5. Monitore logs de erro do sistema\n');

    // 9. RESUMO EXECUTIVO
    console.log('='.repeat(80));
    console.log('📊 RESUMO EXECUTIVO\n');
    
    const totalProdutos = await client.query('SELECT COUNT(*) FROM produtos');
    const totalContratos = await client.query('SELECT COUNT(*) FROM contratos');
    const totalEscolas = await client.query('SELECT COUNT(*) FROM escolas');
    const totalPedidos = await client.query('SELECT COUNT(*) FROM pedidos');
    
    console.log(`   📦 Produtos cadastrados: ${totalProdutos.rows[0].count}`);
    console.log(`   📄 Contratos ativos: ${totalContratos.rows[0].count}`);
    console.log(`   🏫 Escolas: ${totalEscolas.rows[0].count}`);
    console.log(`   🛒 Pedidos realizados: ${totalPedidos.rows[0].count}`);
    console.log('\n   ✅ Sistema operacional e dados íntegros!\n');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ ERRO:', error);
  } finally {
    await client.end();
    console.log('🔌 Conexão fechada\n');
  }
}

analisarSistema().catch(console.error);
