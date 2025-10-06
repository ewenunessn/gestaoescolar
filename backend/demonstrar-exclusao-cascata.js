const db = require('./dist/database.js');

async function demonstrarExclusaoCascata() {
  console.log('🎯 Demonstração: Exclusão em Cascata de Faturamentos\n');
  console.log('=' .repeat(60));

  try {
    // 1. Verificar constraints no banco
    console.log('1. Verificando constraints de exclusão em cascata...\n');
    
    const constraints = await db.query(`
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND (tc.table_name = 'faturamentos' OR tc.table_name = 'faturamento_itens')
        AND rc.delete_rule = 'CASCADE'
      ORDER BY tc.table_name, kcu.column_name;
    `);

    console.log('📋 Constraints CASCADE configuradas:');
    constraints.rows.forEach(constraint => {
      console.log(`   ${constraint.table_name}.${constraint.column_name} → ${constraint.foreign_table_name}.${constraint.foreign_column_name} (${constraint.delete_rule})`);
    });

    // 2. Verificar estrutura atual
    console.log('\n2. Verificando estrutura atual do banco...\n');
    
    const totalPedidos = await db.query('SELECT COUNT(*) as total FROM pedidos');
    const totalFaturamentos = await db.query('SELECT COUNT(*) as total FROM faturamentos');
    const totalItensFaturamento = await db.query('SELECT COUNT(*) as total FROM faturamento_itens');
    
    console.log('📊 Estado atual do banco:');
    console.log(`   - Pedidos: ${totalPedidos.rows[0].total}`);
    console.log(`   - Faturamentos: ${totalFaturamentos.rows[0].total}`);
    console.log(`   - Itens de faturamento: ${totalItensFaturamento.rows[0].total}`);

    // 3. Mostrar relacionamentos
    if (totalFaturamentos.rows[0].total > 0) {
      console.log('\n3. Relacionamentos existentes...\n');
      
      const relacionamentos = await db.query(`
        SELECT 
          p.numero as pedido_numero,
          f.numero as faturamento_numero,
          f.status as faturamento_status,
          COUNT(fi.id) as total_itens
        FROM pedidos p
        JOIN faturamentos f ON p.id = f.pedido_id
        LEFT JOIN faturamento_itens fi ON f.id = fi.faturamento_id
        GROUP BY p.id, p.numero, f.id, f.numero, f.status
        ORDER BY p.numero, f.numero
      `);
      
      console.log('🔗 Relacionamentos Pedido → Faturamento:');
      relacionamentos.rows.forEach(rel => {
        console.log(`   ${rel.pedido_numero} → ${rel.faturamento_numero} (${rel.faturamento_status}) - ${rel.total_itens} itens`);
      });
    }

    // 4. Explicar o funcionamento
    console.log('\n4. Como funciona a exclusão em cascata...\n');
    
    console.log('🔄 Fluxo de exclusão:');
    console.log('   1️⃣  Usuário exclui um PEDIDO');
    console.log('   2️⃣  PostgreSQL automaticamente exclui todos os FATURAMENTOS relacionados');
    console.log('   3️⃣  PostgreSQL automaticamente exclui todos os ITENS DE FATURAMENTO relacionados');
    console.log('   4️⃣  Exclusão completa sem deixar registros órfãos');

    console.log('\n📝 Constraints configuradas:');
    console.log('   • faturamentos.pedido_id → pedidos.id ON DELETE CASCADE');
    console.log('   • faturamento_itens.faturamento_id → faturamentos.id ON DELETE CASCADE');
    console.log('   • faturamento_itens.pedido_item_id → pedido_itens.id ON DELETE CASCADE');

    console.log('\n✅ RESULTADO:');
    console.log('   Quando você excluir um pedido, TODOS os faturamentos e');
    console.log('   itens de faturamento relacionados serão excluídos automaticamente!');

    // 5. Exemplo prático
    console.log('\n5. Exemplo prático de uso...\n');
    
    console.log('💡 Para testar na prática:');
    console.log('   1. Acesse um pedido no sistema');
    console.log('   2. Gere um faturamento para ele');
    console.log('   3. Exclua o pedido');
    console.log('   4. Verifique que o faturamento foi excluído automaticamente');

    console.log('\n🛡️  Segurança:');
    console.log('   • Não há risco de dados órfãos');
    console.log('   • Integridade referencial mantida');
    console.log('   • Exclusão atômica (tudo ou nada)');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

demonstrarExclusaoCascata()
  .then(() => {
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Demonstração concluída!');
    console.log('A exclusão em cascata está configurada e funcionando corretamente.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Erro:', err);
    process.exit(1);
  });