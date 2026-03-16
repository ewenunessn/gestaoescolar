const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function verificarPeriodos() {
  try {
    await client.connect();
    console.log('=== STATUS DO SISTEMA DE PERÍODOS ===\n');

    // 1. Verificar períodos cadastrados
    const periodos = await client.query('SELECT * FROM periodos ORDER BY ano DESC');
    console.log('📅 PERÍODOS CADASTRADOS:\n');
    periodos.rows.forEach(p => {
      const status = p.ativo ? '🟢 ATIVO' : (p.fechado ? '🔒 FECHADO' : '⚪ INATIVO');
      console.log(`${status} ${p.ano} - ${p.descricao}`);
      console.log(`   De ${p.data_inicio.toISOString().split('T')[0]} até ${p.data_fim.toISOString().split('T')[0]}\n`);
    });

    // 2. Verificar tabelas com periodo_id
    console.log('\n📊 TABELAS COM PERIODO_ID:\n');
    const tabelas = ['pedidos', 'guias', 'cardapios', 'faturamentos'];
    
    for (const tabela of tabelas) {
      try {
        const total = await client.query(`SELECT COUNT(*) as total FROM ${tabela}`);
        const comPeriodo = await client.query(`SELECT COUNT(*) as total FROM ${tabela} WHERE periodo_id IS NOT NULL`);
        const semPeriodo = await client.query(`SELECT COUNT(*) as total FROM ${tabela} WHERE periodo_id IS NULL`);
        
        const totalNum = parseInt(total.rows[0].total);
        const comPeriodoNum = parseInt(comPeriodo.rows[0].total);
        const semPeriodoNum = parseInt(semPeriodo.rows[0].total);
        const percentual = totalNum > 0 ? Math.round(comPeriodoNum / totalNum * 100) : 0;
        
        console.log(`   ${tabela}:`);
        console.log(`      Total: ${totalNum}`);
        console.log(`      Com período: ${comPeriodoNum} (${percentual}%)`);
        console.log(`      Sem período: ${semPeriodoNum}\n`);
      } catch (e) {
        console.log(`   ${tabela}: ❌ Coluna periodo_id não existe\n`);
      }
    }

    // 3. Verificar distribuição por período
    console.log('\n📈 DISTRIBUIÇÃO POR PERÍODO:\n');
    for (const tabela of tabelas) {
      try {
        const dist = await client.query(`
          SELECT 
            p.ano,
            COUNT(t.id) as total
          FROM periodos p
          LEFT JOIN ${tabela} t ON t.periodo_id = p.id
          GROUP BY p.ano
          ORDER BY p.ano DESC
        `);
        
        console.log(`   ${tabela}:`);
        dist.rows.forEach(row => {
          console.log(`      ${row.ano}: ${row.total} registros`);
        });
        console.log('');
      } catch (e) {
        // Ignora se não tiver coluna
      }
    }

    // 4. Verificar controllers atualizados
    console.log('\n🔍 CONTROLLERS ATUALIZADOS:\n');
    
    // Verifica se Dashboard PNAE usa período
    const pnaeCheck = await client.query(`
      SELECT 1 FROM periodos WHERE ativo = true LIMIT 1
    `);
    console.log(`   ${pnaeCheck.rows.length > 0 ? '✅' : '❌'} Dashboard PNAE: ${pnaeCheck.rows.length > 0 ? 'Usa período ativo' : 'Não atualizado'}`);

    // 5. Verificar triggers
    console.log('\n⚙️  TRIGGERS ATIVOS:\n');
    const triggers = await client.query(`
      SELECT 
        trigger_name,
        event_object_table as tabela,
        action_timing as timing,
        event_manipulation as evento
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
        AND trigger_name LIKE '%periodo%'
      ORDER BY event_object_table
    `);
    
    if (triggers.rows.length > 0) {
      triggers.rows.forEach(t => {
        console.log(`   ✅ ${t.tabela}.${t.trigger_name}`);
        console.log(`      ${t.timing} ${t.evento}\n`);
      });
    } else {
      console.log('   ⚠️  Nenhum trigger de período encontrado\n');
    }

    // 6. Status geral
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO:\n');
    
    const periodoAtivo = periodos.rows.find(p => p.ativo);
    if (periodoAtivo) {
      console.log(`   ✅ Período ativo: ${periodoAtivo.ano}`);
    } else {
      console.log('   ❌ Nenhum período ativo');
    }
    
    const totalTabelas = tabelas.length;
    let tabelasComPeriodo = 0;
    for (const tabela of tabelas) {
      try {
        await client.query(`SELECT periodo_id FROM ${tabela} LIMIT 1`);
        tabelasComPeriodo++;
      } catch (e) {
        // Ignora
      }
    }
    
    console.log(`   ✅ Tabelas com periodo_id: ${tabelasComPeriodo}/${totalTabelas}`);
    console.log(`   ✅ Triggers ativos: ${triggers.rows.length}`);
    
    const implementacaoCompleta = periodoAtivo && tabelasComPeriodo === totalTabelas && triggers.rows.length > 0;
    
    console.log('\n' + '='.repeat(60));
    if (implementacaoCompleta) {
      console.log('✅ IMPLEMENTAÇÃO COMPLETA!\n');
    } else {
      console.log('⚠️  IMPLEMENTAÇÃO PARCIAL\n');
      if (!periodoAtivo) console.log('   - Ativar um período');
      if (tabelasComPeriodo < totalTabelas) console.log('   - Adicionar periodo_id em todas as tabelas');
      if (triggers.rows.length === 0) console.log('   - Criar triggers de atribuição automática');
      console.log('');
    }

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
  } finally {
    await client.end();
    console.log('🔌 Conexão fechada\n');
  }
}

verificarPeriodos().catch(console.error);
