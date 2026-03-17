const { Client } = require('pg');

const LOCAL_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'alimentacao_escolar',
  user: 'postgres',
  password: 'admin123',
  ssl: false
};

async function testar() {
  const client = new Client(LOCAL_CONFIG);
  
  try {
    console.log('🔄 Conectando ao banco local...');
    await client.connect();
    console.log('✅ Conectado\n');

    // 1. Verificar períodos existentes
    console.log('📅 Períodos cadastrados:');
    const periodos = await client.query('SELECT * FROM periodos ORDER BY ano');
    periodos.rows.forEach(p => {
      console.log(`   ${p.ano}: ${p.descricao} (${p.data_inicio} a ${p.data_fim}) ${p.ativo ? '✅ ATIVO' : ''}`);
    });

    // 2. Verificar se a coluna periodo_id existe em pedidos
    console.log('\n🔍 Verificando estrutura da tabela pedidos:');
    const colunas = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'pedidos' AND column_name IN ('periodo_id', 'data_pedido')
      ORDER BY column_name
    `);
    colunas.rows.forEach(c => {
      console.log(`   ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`);
    });

    // 3. Verificar se o trigger existe
    console.log('\n🔧 Verificando trigger:');
    const trigger = await client.query(`
      SELECT trigger_name, event_manipulation, action_timing
      FROM information_schema.triggers
      WHERE event_object_table = 'pedidos' AND trigger_name = 'trg_pedidos_atribuir_periodo'
    `);
    if (trigger.rows.length > 0) {
      console.log(`   ✅ Trigger trg_pedidos_atribuir_periodo existe`);
      console.log(`      Evento: ${trigger.rows[0].event_manipulation}`);
      console.log(`      Timing: ${trigger.rows[0].action_timing}`);
    } else {
      console.log(`   ⚠️  Trigger trg_pedidos_atribuir_periodo NÃO encontrado`);
    }

    // 4. Testar inserção de pedido simulado
    console.log('\n🧪 Testando inserção de pedido simulado...');
    await client.query('BEGIN');
    
    const testResult = await client.query(`
      INSERT INTO pedidos (
        numero, data_pedido, status, valor_total, observacoes, usuario_criacao_id, competencia_mes_ano
      )
      VALUES ('TEST-2026-000001', CURRENT_DATE, 'pendente', 0, 'Teste de período', 1, '2026-03')
      RETURNING id, numero, data_pedido, periodo_id
    `);

    const pedidoTeste = testResult.rows[0];
    console.log(`   ✅ Pedido criado: ${pedidoTeste.numero}`);
    console.log(`      ID: ${pedidoTeste.id}`);
    console.log(`      Data: ${pedidoTeste.data_pedido}`);
    console.log(`      Periodo ID: ${pedidoTeste.periodo_id || '⚠️  NULL'}`);

    if (pedidoTeste.periodo_id) {
      const periodoInfo = await client.query('SELECT * FROM periodos WHERE id = $1', [pedidoTeste.periodo_id]);
      if (periodoInfo.rows.length > 0) {
        console.log(`      Período: ${periodoInfo.rows[0].ano} - ${periodoInfo.rows[0].descricao}`);
      }
    }

    await client.query('ROLLBACK');
    console.log('   🔄 Rollback executado (teste não afetou o banco)');

    console.log('\n✅ Teste concluído com sucesso!');
    console.log('\n📝 Conclusão:');
    if (pedidoTeste.periodo_id) {
      console.log('   ✅ O trigger está funcionando corretamente');
      console.log('   ✅ Pedidos serão criados com periodo_id automaticamente');
    } else {
      console.log('   ⚠️  O trigger NÃO atribuiu periodo_id automaticamente');
      console.log('   ⚠️  Pode ser necessário verificar a função fn_atribuir_periodo()');
    }

  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error.message);
    await client.query('ROLLBACK');
  } finally {
    await client.end();
    console.log('\n🔌 Desconectado');
  }
}

testar();
