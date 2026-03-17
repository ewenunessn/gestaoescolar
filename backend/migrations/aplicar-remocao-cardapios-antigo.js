const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração local
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'alimentacao_escolar',
  password: 'admin123',
  port: 5432,
  ssl: false
});

async function removerCardapiosAntigo() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️  REMOVENDO SISTEMA ANTIGO DE CARDÁPIOS\n');
    console.log('='.repeat(60));

    // Verificar se há dados
    console.log('\n📊 Verificando dados existentes...');
    
    const cardapiosAntigos = await client.query(`
      SELECT COUNT(*) as total FROM cardapios
    `);
    
    const cardapiosNovos = await client.query(`
      SELECT COUNT(*) as total FROM cardapios_modalidade
    `);

    console.log(`\nTabela ANTIGA (cardapios): ${cardapiosAntigos.rows[0].total} registros`);
    console.log(`Tabela NOVA (cardapios_modalidade): ${cardapiosNovos.rows[0].total} registros`);

    if (parseInt(cardapiosAntigos.rows[0].total) > 0) {
      console.log('\n⚠️  ATENÇÃO: Existem cardápios na tabela antiga!');
      
      const listaAntigos = await client.query(`
        SELECT id, nome, descricao, data_inicio, data_fim, ativo
        FROM cardapios
        ORDER BY created_at DESC
      `);
      
      console.log('\n📋 Cardápios que serão removidos:');
      console.table(listaAntigos.rows);
      
      console.log('\n⚠️  Esses dados serão PERMANENTEMENTE removidos!');
      console.log('Se precisar migrar dados, cancele agora (Ctrl+C)');
      console.log('\nContinuando em 5 segundos...');
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Ler e executar migração
    console.log('\n🔧 Executando migração...');
    const sqlPath = path.join(__dirname, '20260316_remover_cardapios_antigo.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);
    
    console.log('\n✅ Migração executada com sucesso!');

    // Verificar resultado
    console.log('\n📊 Verificando resultado...');
    
    const verificacao = await client.query(`
      SELECT 
        table_name,
        CASE 
          WHEN table_name = 'cardapios_modalidade' THEN '✅ Sistema novo de cardápios'
          WHEN table_name = 'cardapio_refeicoes_dia' THEN '✅ Sistema novo de refeições'
          ELSE '📋 Outra tabela'
        END as descricao
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'cardapio%'
      ORDER BY table_name
    `);

    console.log('\n📋 Tabelas de cardápios restantes:');
    console.table(verificacao.rows);

    // Verificar se tabelas antigas foram removidas
    const tabelasAntigas = await client.query(`
      SELECT 
        CASE 
          WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cardapios') 
          THEN '✅ Removida'
          ELSE '❌ Ainda existe'
        END as cardapios,
        CASE 
          WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cardapio_refeicoes') 
          THEN '✅ Removida'
          ELSE '❌ Ainda existe'
        END as cardapio_refeicoes
    `);

    console.log('\n🗑️  Status da remoção:');
    console.table(tabelasAntigas.rows);

    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRAÇÃO CONCLUÍDA!');
    console.log('\nSistema agora usa apenas:');
    console.log('  📋 cardapios_modalidade (cardápios mensais por modalidade)');
    console.log('  🍽️  cardapio_refeicoes_dia (refeições por dia)');

  } catch (error) {
    console.error('\n❌ Erro durante a migração:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

removerCardapiosAntigo().catch(console.error);
