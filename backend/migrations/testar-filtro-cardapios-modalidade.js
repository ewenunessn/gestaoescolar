const { Pool } = require('pg');

// Configuração local
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'alimentacao_escolar',
  password: 'admin123',
  port: 5432,
  ssl: false
});

async function testarFiltro() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 TESTANDO FILTRO DE CARDÁPIOS POR MODALIDADE\n');
    console.log('='.repeat(60));

    // Estado inicial
    console.log('\n📊 Estado inicial dos períodos:');
    const periodos = await client.query(`
      SELECT id, ano, ativo, ocultar_dados
      FROM periodos
      ORDER BY ano DESC
    `);
    console.table(periodos.rows);

    // Total de cardápios
    console.log('\n📋 Cardápios por modalidade no banco:');
    const totalCardapios = await client.query(`
      SELECT 
        cm.id,
        cm.nome,
        cm.ano,
        cm.mes,
        cm.periodo_id,
        p.ano as periodo_ano,
        p.ocultar_dados
      FROM cardapios_modalidade cm
      LEFT JOIN periodos p ON cm.periodo_id = p.id
      ORDER BY cm.ano DESC, cm.mes DESC
    `);
    console.table(totalCardapios.rows);
    console.log(`Total: ${totalCardapios.rows.length} cardápios`);

    // Cardápios visíveis (com filtro)
    console.log('\n✅ Cardápios visíveis (com filtro):');
    const cardapiosVisiveis = await client.query(`
      SELECT 
        cm.id,
        cm.nome,
        cm.ano,
        cm.mes,
        cm.periodo_id,
        p.ano as periodo_ano,
        p.ocultar_dados
      FROM cardapios_modalidade cm
      LEFT JOIN periodos p ON cm.periodo_id = p.id
      WHERE (p.ocultar_dados = false OR p.ocultar_dados IS NULL)
      ORDER BY cm.ano DESC, cm.mes DESC
    `);
    console.table(cardapiosVisiveis.rows);
    console.log(`Total: ${cardapiosVisiveis.rows.length} cardápios visíveis`);

    // Criar cardápio de teste em 2025
    console.log('\n➕ Criando cardápio de teste em 2025...');
    await client.query(`
      INSERT INTO cardapios_modalidade (modalidade_id, nome, mes, ano, ativo)
      VALUES (1, 'Teste 2025', 3, 2025, true)
      ON CONFLICT (modalidade_id, mes, ano) DO NOTHING
    `);

    // Ocultar período 2025
    console.log('🔒 Ocultando dados do período 2025...');
    await client.query(`UPDATE periodos SET ocultar_dados = true WHERE ano = 2025`);

    // Verificar cardápios visíveis após ocultar
    console.log('\n📊 Cardápios visíveis após ocultar 2025:');
    const cardapiosAposOcultar = await client.query(`
      SELECT 
        cm.id,
        cm.nome,
        cm.ano,
        cm.mes,
        cm.periodo_id,
        p.ano as periodo_ano,
        p.ocultar_dados
      FROM cardapios_modalidade cm
      LEFT JOIN periodos p ON cm.periodo_id = p.id
      WHERE (p.ocultar_dados = false OR p.ocultar_dados IS NULL)
      ORDER BY cm.ano DESC, cm.mes DESC
    `);
    console.table(cardapiosAposOcultar.rows);
    console.log(`Total: ${cardapiosAposOcultar.rows.length} cardápios visíveis`);

    // Verificar se cardápio de 2025 foi ocultado
    const cardapio2025Visivel = cardapiosAposOcultar.rows.some(c => c.ano === 2025);
    
    if (!cardapio2025Visivel) {
      console.log('\n✅ TESTE PASSOU: Cardápio de 2025 foi ocultado corretamente!');
    } else {
      console.log('\n❌ TESTE FALHOU: Cardápio de 2025 ainda está visível!');
    }

    // Restaurar estado
    console.log('\n🔄 Restaurando estado original...');
    await client.query(`UPDATE periodos SET ocultar_dados = false WHERE ano = 2025`);
    await client.query(`DELETE FROM cardapios_modalidade WHERE nome = 'Teste 2025' AND ano = 2025`);

    console.log('\n✅ Teste concluído!');

  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

testarFiltro().catch(console.error);
