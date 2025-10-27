const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function verificarDadosTeste() {
  try {
    console.log('🔍 Verificando se você está testando com dados novos ou antigos...\n');

    // 1. Verificar lotes criados hoje
    console.log('📅 Lotes criados hoje:');
    const hoje = new Date().toISOString().split('T')[0];
    
    const lotesHoje = await pool.query(`
      SELECT 
        id,
        lote,
        produto_id,
        quantidade_atual,
        data_validade,
        data_validade::text as data_validade_raw,
        created_at,
        updated_at
      FROM estoque_lotes 
      WHERE DATE(created_at) = CURRENT_DATE
      ORDER BY created_at DESC
      LIMIT 10
    `);

    if (lotesHoje.rows.length > 0) {
      console.log(`Encontrados ${lotesHoje.rows.length} lotes criados hoje:`);
      lotesHoje.rows.forEach((lote, index) => {
        console.log(`\n${index + 1}. Lote: ${lote.lote}`);
        console.log(`   Data validade: ${lote.data_validade_raw}`);
        console.log(`   Criado em: ${lote.created_at}`);
        console.log(`   Produto ID: ${lote.produto_id}`);
        
        // Simular como seria interpretado no app
        const dataRaw = lote.data_validade_raw;
        const dataAntiga = new Date(dataRaw);
        const [ano, mes, dia] = dataRaw.split('-').map(Number);
        const dataCorrigida = new Date(ano, mes - 1, dia);
        
        console.log(`   App (método antigo): ${dataAntiga.toLocaleDateString('pt-BR')}`);
        console.log(`   App (método corrigido): ${dataCorrigida.toLocaleDateString('pt-BR')}`);
      });
    } else {
      console.log('❌ Nenhum lote foi criado hoje.');
      console.log('💡 Para testar a correção, você precisa cadastrar um NOVO lote.');
    }

    // 2. Verificar lotes da Abóbora especificamente
    console.log('\n\n🥕 Lotes da Abóbora (todos):');
    const lotesAbobora = await pool.query(`
      SELECT 
        el.id,
        el.lote,
        el.quantidade_atual,
        el.data_validade::text as data_validade_raw,
        el.created_at,
        p.nome as produto_nome
      FROM estoque_lotes el
      JOIN produtos p ON p.id = el.produto_id
      WHERE p.nome ILIKE '%abóbora%'
      ORDER BY el.created_at DESC
      LIMIT 5
    `);

    lotesAbobora.rows.forEach((lote, index) => {
      console.log(`\n${index + 1}. ${lote.produto_nome} - ${lote.lote}`);
      console.log(`   Data validade: ${lote.data_validade_raw}`);
      console.log(`   Criado em: ${lote.created_at}`);
      
      // Verificar se foi criado hoje
      const criadoHoje = lote.created_at.toISOString().split('T')[0] === hoje;
      console.log(`   ${criadoHoje ? '🆕 NOVO (criado hoje)' : '📅 ANTIGO (criado antes)'}`);
      
      // Simular interpretação
      const dataRaw = lote.data_validade_raw;
      const dataAntiga = new Date(dataRaw);
      const [ano, mes, dia] = dataRaw.split('-').map(Number);
      const dataCorrigida = new Date(ano, mes - 1, dia);
      
      console.log(`   App (método antigo): ${dataAntiga.toLocaleDateString('pt-BR')}`);
      console.log(`   App (método corrigido): ${dataCorrigida.toLocaleDateString('pt-BR')}`);
      
      if (dataAntiga.getDate() !== dataCorrigida.getDate()) {
        console.log(`   ⚠️  DIFERENÇA: ${criadoHoje ? 'Correção deveria funcionar' : 'Dado antigo - normal ter diferença'}`);
      }
    });

    // 3. Instruções para teste
    console.log('\n\n📋 INSTRUÇÕES PARA TESTAR A CORREÇÃO:');
    console.log('');
    console.log('1. 🆕 Cadastre um NOVO lote com data de validade');
    console.log('2. 📱 Verifique se a data aparece corretamente no app');
    console.log('3. 🔄 Se ainda aparecer errado, pode ser cache do app');
    console.log('');
    console.log('💡 IMPORTANTE:');
    console.log('- Lotes antigos (criados antes da correção) continuarão com problema');
    console.log('- Apenas lotes NOVOS (criados após correção) devem funcionar');
    console.log('- Se lotes novos ainda têm problema, pode ser cache do React Native');
    console.log('');
    console.log('🔧 Para limpar cache do React Native:');
    console.log('- npx react-native start --reset-cache');
    console.log('- ou expo start -c');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

verificarDadosTeste();